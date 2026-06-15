import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth: require admin ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: claimsData.claims.sub,
      _role: "admin",
    });
    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { rawText, educationLevels, educationFields, provinces } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context strings for AI
    const levelNames = educationLevels.map((l: any) => `${l.value} (${l.label})`).join(", ");
    const fieldNames = educationFields
      .map((f: any) => `id="${f.id}" name="${f.name}" level="${f.education_level}" display="${f.display_name}"`)
      .join("\n");
    const provinceNames = provinces.map((p: any) => p.value).join(", ");

    const systemPrompt = `You are a job data extraction assistant for a Pakistani government job portal. 
Extract all job listings from the provided text and return them as a JSON array.

AVAILABLE EDUCATION LEVELS (use ONLY these values for required_education_levels):
${levelNames}

AVAILABLE EDUCATION FIELDS (use ONLY these IDs for required_education_fields — match by name/display_name):
${fieldNames}

AVAILABLE PROVINCES (use ONLY these exact values):
${provinceNames}

RULES:
- Extract ALL jobs found in the text, even if format varies
- required_education_levels: array of level values (e.g. ["matric", "intermediate"])
- required_education_fields: array of field IDs (the "id" values above), only if specialization is mentioned — match intelligently to closest field; if no match exists, omit the field
- gender_requirement: "male" | "female" | "other" | null (null if any/all/both/not specified)
- provinces: array of province names from available list; empty array if not specified or "all Pakistan"
- last_date: YYYY-MM-DD format
- All fee fields default to 0 if not mentioned
- min_age defaults to 18, max_age defaults to 35 if not specified
- total_seats defaults to 1 if not specified
- domicile: string or null
- advertisement_link: URL string or null (link to the original job advertisement)
- advertisement_image: URL string or null (image of the job advertisement)

Return ONLY a valid JSON array of objects. No explanation text, no markdown, no code fences. Just the raw JSON array.

Example output format:
[
  {
    "title": "Assistant Sub Inspector",
    "department": "Punjab Police",
    "description": "Assist in maintaining law and order",
    "required_education_levels": ["intermediate"],
    "required_education_fields": [],
    "min_age": 18,
    "max_age": 30,
    "gender_requirement": "male",
    "provinces": ["Punjab"],
    "domicile": null,
    "total_seats": 500,
    "last_date": "2026-03-15",
    "bank_challan_fee": 500,
    "post_office_fee": 200,
    "photocopy_fee": 100,
    "expert_fee": 1000,
    "advertisement_link": "https://example.com/ad",
    "advertisement_image": null
  }
]`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: rawText },
          ],
          temperature: 0.1,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from AI");
    }

    // Parse the JSON from AI response - handle possible markdown code blocks
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
    }

    let jobs;
    try {
      jobs = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI JSON:", jsonStr);
      throw new Error("AI returned invalid JSON. Please try again.");
    }

    if (!Array.isArray(jobs)) {
      throw new Error("AI returned unexpected format. Please try again.");
    }

    // Validate and sanitize each job
    const validJobs = [];
    const errors = [];

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];

      if (!job.title) { errors.push(`Job ${i + 1}: Missing title`); continue; }
      if (!job.department) { errors.push(`Job ${i + 1} (${job.title}): Missing department`); continue; }
      if (!job.required_education_levels || job.required_education_levels.length === 0) {
        errors.push(`Job ${i + 1} (${job.title}): Missing education levels`);
        continue;
      }
      if (!job.last_date) { errors.push(`Job ${i + 1} (${job.title}): Missing last date`); continue; }

      // Validate education levels against available
      const validLevelValues = educationLevels.map((l: any) => l.value);
      const validEduLevels = job.required_education_levels.filter((l: string) =>
        validLevelValues.includes(l)
      );
      if (validEduLevels.length === 0) {
        errors.push(`Job ${i + 1} (${job.title}): No valid education levels found`);
        continue;
      }

      // Validate education field IDs
      const validFieldIds = educationFields.map((f: any) => f.id);
      const validEduFields = (job.required_education_fields || []).filter((id: string) =>
        validFieldIds.includes(id)
      );

      // Validate provinces
      const validProvinceValues = provinces.map((p: any) => p.value);
      const validProvinces = (job.provinces || []).filter((p: string) =>
        validProvinceValues.some((vp: string) => vp.toLowerCase() === p.toLowerCase())
      );

      validJobs.push({
        title: job.title,
        department: job.department,
        description: job.description || null,
        required_education_levels: validEduLevels,
        required_education_fields: validEduFields.length > 0 ? validEduFields : undefined,
        min_age: Number(job.min_age) || 18,
        max_age: Number(job.max_age) || 35,
        gender_requirement: job.gender_requirement || null,
        provinces: validProvinces.length > 0 ? validProvinces : undefined,
        domicile: job.domicile || undefined,
        total_seats: Number(job.total_seats) || 1,
        last_date: job.last_date,
        bank_challan_fee: Number(job.bank_challan_fee) || 0,
        post_office_fee: Number(job.post_office_fee) || 0,
        photocopy_fee: Number(job.photocopy_fee) || 0,
        expert_fee: Number(job.expert_fee) || 0,
        advertisement_link: job.advertisement_link || undefined,
        advertisement_image: job.advertisement_image || undefined,
      });
    }

    return new Response(
      JSON.stringify({ jobs: validJobs, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-jobs-ai error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
