import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  Eye,
  FileQuestion,
  FileUp,
  Plus,
  ClipboardPaste,
  Copy,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAllEducationLevels } from "@/hooks/useEducationLevels";
import { useEducationFields } from "@/hooks/useEducationFields";
import { useBulkCreateJobs } from "@/hooks/useBulkJobImport";
import { toast } from "@/hooks/use-toast";
import BulkJobPreviewEditor, { type EditableJob } from "@/components/admin/BulkJobPreviewEditor";

const PROVINCE_OPTIONS = [
  { value: "Punjab", label: "Punjab" },
  { value: "Sindh", label: "Sindh" },
  { value: "Khyber Pakhtunkhwa", label: "Khyber Pakhtunkhwa" },
  { value: "Balochistan", label: "Balochistan" },
  { value: "Islamabad", label: "Islamabad" },
  { value: "AJK", label: "AJK" },
  { value: "Gilgit-Baltistan", label: "Gilgit-Baltistan" },
];

const MANUAL_JSON_TEMPLATE = `[
  {
    "title": "Assistant Sub Inspector",
    "department": "Punjab Police",
    "description": "",
    "required_education_levels": ["intermediate"],
    "required_education_fields": [],
    "min_age": 18,
    "max_age": 30,
    "gender_requirement": "male",
    "provinces": ["Punjab"],
    "domicile": "Punjab",
    "total_seats": 500,
    "last_date": "2026-03-15",
    "bank_challan_fee": 500,
    "post_office_fee": 200,
    "photocopy_fee": 100,
    "expert_fee": 1000,
    "advertisement_link": "",
    "advertisement_image": ""
  }
]`;

const BulkJobImport = () => {
  const navigate = useNavigate();
  const { data: educationLevels = [] } = useAllEducationLevels();
  const { data: educationFields = [] } = useEducationFields();
  const bulkCreateJobs = useBulkCreateJobs();

  // AI import state
  const [bulkJobText, setBulkJobText] = useState("");
  const [bulkParseResult, setBulkParseResult] = useState<{
    jobs: EditableJob[];
    errors: string[];
  } | null>(null);
  const [isAIParsing, setIsAIParsing] = useState(false);

  // Manual JSON import state
  const [manualJsonText, setManualJsonText] = useState("");
  const [manualParseResult, setManualParseResult] = useState<{
    jobs: EditableJob[];
    errors: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleParseBulkJobsAI = async () => {
    if (!bulkJobText.trim()) return;
    setIsAIParsing(true);
    setBulkParseResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("parse-jobs-ai", {
        body: {
          rawText: bulkJobText,
          educationLevels,
          educationFields,
          provinces: PROVINCE_OPTIONS,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setBulkParseResult({ jobs: data.jobs || [], errors: data.errors || [] });

      if ((data.errors || []).length > 0) {
        toast({
          title: `${data.errors.length} issue(s) found`,
          description: "Some jobs could not be parsed. Check the preview for details.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "AI Parsing Failed",
        description: err.message || "Failed to parse jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAIParsing(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkParseResult || bulkParseResult.jobs.length === 0) return;
    try {
      await bulkCreateJobs.mutateAsync(bulkParseResult.jobs);
      navigate("/admin");
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(MANUAL_JSON_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isValidUrl = (val: string) => {
    if (!val) return false;
    try {
      const u = new URL(val);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const allProvinceValues = PROVINCE_OPTIONS.map((p) => p.value);
  const validLevelValues = new Set(educationLevels.map((l) => l.value.toLowerCase()));

  const handleParseManualJson = () => {
    if (!manualJsonText.trim()) return;
    try {
      const parsed = JSON.parse(manualJsonText);
      const jobsArray = Array.isArray(parsed) ? parsed : [parsed];
      const errors: string[] = [];

      const validJobs: EditableJob[] = jobsArray.map((job: any, idx: number) => {
        if (!job.title) errors.push(`Job #${idx + 1}: missing title`);
        if (!job.department) errors.push(`Job #${idx + 1}: missing department`);
        if (!job.last_date) errors.push(`Job #${idx + 1}: missing last_date`);

        // Normalize education levels: lowercase + match available values
        const rawLevels: string[] = Array.isArray(job.required_education_levels)
          ? job.required_education_levels
          : [];
        const normalizedLevels = rawLevels
          .map((lv) => String(lv).trim().toLowerCase().replace(/\s+/g, "_"))
          .filter((lv) => validLevelValues.has(lv));

        // Education fields: accept IDs OR names; if empty + levels set → auto-select ALL fields for those levels
        const rawFields: string[] = Array.isArray(job.required_education_fields)
          ? job.required_education_fields
          : [];
        let normalizedFields: string[] = [];
        if (rawFields.length > 0) {
          normalizedFields = rawFields
            .map((f) => {
              const s = String(f).trim();
              const byId = educationFields.find((ef) => ef.id === s);
              if (byId) return byId.id;
              const byName = educationFields.find(
                (ef) =>
                  ef.name.toLowerCase() === s.toLowerCase() ||
                  ef.display_name.toLowerCase() === s.toLowerCase()
              );
              return byName?.id;
            })
            .filter((x): x is string => !!x);
        } else if (normalizedLevels.length > 0) {
          // Auto-select all fields available for the chosen levels
          normalizedFields = educationFields
            .filter((ef) => normalizedLevels.includes(ef.education_level))
            .map((ef) => ef.id);
        }

        // Provinces: empty → select all
        const rawProvinces: string[] = Array.isArray(job.provinces) ? job.provinces : [];
        let normalizedProvinces = rawProvinces
          .map((p) => {
            const match = PROVINCE_OPTIONS.find(
              (po) => po.value.toLowerCase() === String(p).trim().toLowerCase()
            );
            return match?.value;
          })
          .filter((x): x is string => !!x);
        if (normalizedProvinces.length === 0) {
          normalizedProvinces = [...allProvinceValues];
        }

        // Gender: empty/missing → null (= "Any")
        let gender: "male" | "female" | "other" | null = null;
        if (job.gender_requirement) {
          const g = String(job.gender_requirement).toLowerCase();
          if (["male", "female", "other"].includes(g)) gender = g as any;
        }

        // Advertisement image: must be a full URL, otherwise drop & warn
        let adImage = "";
        if (job.advertisement_image) {
          if (isValidUrl(String(job.advertisement_image))) {
            adImage = String(job.advertisement_image);
          } else {
            errors.push(
              `Job #${idx + 1}: advertisement_image must be a full URL (https://...) — value ignored`
            );
          }
        }

        let adLink = "";
        if (job.advertisement_link) {
          if (isValidUrl(String(job.advertisement_link))) {
            adLink = String(job.advertisement_link);
          } else {
            errors.push(
              `Job #${idx + 1}: advertisement_link must be a full URL (https://...) — value ignored`
            );
          }
        }

        return {
          title: job.title || `Untitled Job ${idx + 1}`,
          department: job.department || "Unknown Department",
          description: job.description || "",
          required_education_levels: normalizedLevels,
          required_education_fields: normalizedFields,
          min_age: job.min_age ?? 18,
          max_age: job.max_age ?? 35,
          gender_requirement: gender,
          provinces: normalizedProvinces,
          domicile: job.domicile || "",
          total_seats: job.total_seats ?? 1,
          last_date: job.last_date || new Date().toISOString().split("T")[0],
          bank_challan_fee: job.bank_challan_fee ?? 0,
          post_office_fee: job.post_office_fee ?? 0,
          photocopy_fee: job.photocopy_fee ?? 0,
          expert_fee: job.expert_fee ?? 0,
          advertisement_link: adLink,
          advertisement_image: adImage,
        };
      });

      setManualParseResult({ jobs: validJobs, errors });

      if (errors.length > 0) {
        toast({
          title: `${errors.length} warning(s)`,
          description: "Some fields are missing. Review before importing.",
          variant: "destructive",
        });
      } else {
        toast({
          title: `${validJobs.length} job(s) parsed`,
          description: "Review and edit before importing.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Invalid JSON",
        description: "Please check your JSON format and try again.",
        variant: "destructive",
      });
    }
  };

  const handleManualImport = async () => {
    if (!manualParseResult || manualParseResult.jobs.length === 0) return;
    try {
      await bulkCreateJobs.mutateAsync(manualParseResult.jobs);
      navigate("/admin");
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <div className="py-6 sm:py-8">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin")}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <FileUp className="h-6 w-6 sm:h-7 sm:w-7" />
              Add Multiple Jobs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Use AI parsing or paste structured JSON to import jobs in bulk.
            </p>
          </div>
        </div>

        {/* ========== SECTION 1: AI Import (existing) ========== */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Method 1: AI-Powered Import</h2>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Powered by AI
            </Badge>
          </div>

          {/* Sample format guide */}
          <div className="bg-muted/50 rounded-lg p-4 mb-4 border">
            <p className="font-medium text-sm mb-1">How it works</p>
            <p className="text-muted-foreground text-xs mb-2">
              Paste job listings in any format. AI extracts: title, department, description, education levels &amp; fields, age, gender, provinces, domicile, seats, last date, fees, advertisement link &amp; image.
            </p>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2">
                  <FileQuestion className="h-3 w-3" />
                  Show sample format
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 p-3 bg-background border rounded text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap text-muted-foreground max-h-60 overflow-y-auto">
{`Assistant Sub Inspector – Punjab Police
Qualification: Intermediate (Science)
Age: 18-30 | Gender: Male | Seats: 500
Last Date: March 15, 2026
Provinces: Punjab, Sindh | Domicile: Punjab
Bank Challan: Rs. 500 | Post Office: Rs. 200
Photocopy Fee: Rs. 100 | Expert Fee: Rs. 1000
Ad Link: https://punjabpolice.gov.pk/jobs/asi
Ad Image: https://example.com/ad.jpg

Junior Clerk – Ministry of Finance
Qualification: Bachelor (Computer Science, Commerce)
Age: 18-35 | Gender: Any | Seats: 200
Last Date: April 1, 2026
All Pakistan
Bank Challan: Rs. 400 | Expert Fee: Rs. 800`}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* AI Paste area */}
          {!bulkParseResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Paste Job Data</Label>
                <Textarea
                  placeholder="Paste any job listing text here — any format works. AI will extract all fields automatically."
                  rows={10}
                  value={bulkJobText}
                  onChange={(e) => setBulkJobText(e.target.value)}
                  className="text-sm"
                />
              </div>
              <Button
                onClick={handleParseBulkJobsAI}
                disabled={!bulkJobText.trim() || isAIParsing}
                className="gap-2"
              >
                {isAIParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI is parsing…
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Parse with AI
                  </>
                )}
              </Button>
            </div>
          )}

          {bulkParseResult && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBulkParseResult(null)}
                className="text-xs gap-1"
              >
                ← Back to paste
              </Button>
              <BulkJobPreviewEditor
                jobs={bulkParseResult.jobs}
                errors={bulkParseResult.errors}
                educationLevels={educationLevels}
                educationFields={educationFields}
                provinceOptions={PROVINCE_OPTIONS}
                onJobsChange={(updated) =>
                  setBulkParseResult((prev) =>
                    prev ? { ...prev, jobs: updated } : null
                  )
                }
                onImport={handleBulkImport}
                isImporting={bulkCreateJobs.isPending}
                fullPage
              />
            </div>
          )}
        </div>

        <Separator className="my-8" />

        {/* ========== SECTION 2: Manual JSON Import (new, free) ========== */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Method 2: Paste JSON (Free, No AI)</h2>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Free
            </Badge>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mb-4 border">
            <p className="font-medium text-sm mb-1">How it works</p>
            <p className="text-muted-foreground text-xs mb-2">
              Copy the JSON template below, fill it with your job data using any external tool (ChatGPT, notepad, etc.), then paste it back here. No AI cost involved.
            </p>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">JSON Template</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleCopyTemplate}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Template
                    </>
                  )}
                </Button>
              </div>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2">
                    <FileQuestion className="h-3 w-3" />
                    View template &amp; field guide
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 p-3 bg-background border rounded text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap text-muted-foreground max-h-60 overflow-y-auto">
{MANUAL_JSON_TEMPLATE}
                  </pre>
                  <div className="mt-2 p-3 bg-background border rounded text-xs text-muted-foreground space-y-1">
                    <p><strong>Field Guide:</strong></p>
                    <p>• <code>required_education_levels</code>: {`["matric", "intermediate", "bachelor", "master", "phd"]`} (or any custom level name)</p>
                    <p>• <code>required_education_fields</code>: Field IDs or field names. <strong>Leave empty <code>[]</code></strong> to auto-select ALL fields for the chosen levels.</p>
                    <p>• <code>gender_requirement</code>: <code>"male"</code>, <code>"female"</code>, <code>"other"</code>. Leave empty/<code>null</code> → defaults to <strong>Any</strong>.</p>
                    <p>• <code>provinces</code>: {`["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad", "AJK", "Gilgit-Baltistan"]`}. Leave empty <code>[]</code> → <strong>all provinces</strong> selected.</p>
                    <p>• <code>advertisement_image</code> &amp; <code>advertisement_link</code>: Must be a <strong>full URL</strong> starting with <code>https://</code> (e.g. <code>https://example.com/ad.jpg</code>).</p>
                    <p>• <code>last_date</code>: Format <code>YYYY-MM-DD</code></p>
                    <p>• All fee fields are numbers (no "Rs." prefix)</p>
                    <p>• Add multiple jobs as array items: <code>[{`{job1}, {job2}`}]</code></p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* Manual JSON paste area */}
          {!manualParseResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Paste JSON</Label>
                <Textarea
                  placeholder='Paste your JSON here — e.g. [{"title": "...", "department": "...", ...}]'
                  rows={10}
                  value={manualJsonText}
                  onChange={(e) => setManualJsonText(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>
              <Button
                onClick={handleParseManualJson}
                disabled={!manualJsonText.trim()}
                className="gap-2"
                variant="secondary"
              >
                <ClipboardPaste className="h-4 w-4" />
                Parse JSON
              </Button>
            </div>
          )}

          {manualParseResult && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setManualParseResult(null)}
                className="text-xs gap-1"
              >
                ← Back to paste
              </Button>
              <BulkJobPreviewEditor
                jobs={manualParseResult.jobs}
                errors={manualParseResult.errors}
                educationLevels={educationLevels}
                educationFields={educationFields}
                provinceOptions={PROVINCE_OPTIONS}
                onJobsChange={(updated) =>
                  setManualParseResult((prev) =>
                    prev ? { ...prev, jobs: updated } : null
                  )
                }
                onImport={handleManualImport}
                isImporting={bulkCreateJobs.isPending}
                fullPage
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkJobImport;
