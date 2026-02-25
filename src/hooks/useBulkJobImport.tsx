import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParsedJob {
  title: string;
  department: string;
  description?: string;
  required_education_levels: string[];
  required_education_fields?: string[];
  min_age: number;
  max_age: number;
  gender_requirement?: "male" | "female" | "other" | null;
  provinces?: string[];
  domicile?: string;
  total_seats: number;
  last_date: string;
  bank_challan_fee: number;
  post_office_fee: number;
  photocopy_fee: number;
  expert_fee: number;
}

export interface EducationField {
  id: string;
  name: string;
  display_name: string;
  education_level: string;
}

export interface ValidationOptions {
  educationLevels: { value: string; label: string }[];
  educationFields: EducationField[];
  provinces: { value: string; label: string }[];
}

export interface MissingEducationField {
  name: string;
  suggestedLevel: string;
}

const VALID_GENDERS = ["male", "female", "other", "any", "both"];

export const BULK_JOB_SAMPLE = `[
  {
    "title": "Assistant Sub Inspector",
    "department": "Punjab Police",
    "description": "Assist in maintaining law and order",
    "required_education_levels": ["matric", "intermediate"],
    "required_education_fields": ["science", "arts"],
    "min_age": 18,
    "max_age": 30,
    "gender_requirement": null,
    "provinces": ["Punjab", "Sindh"],
    "domicile": "Punjab",
    "total_seats": 500,
    "last_date": "2026-03-15",
    "bank_challan_fee": 500,
    "post_office_fee": 200,
    "photocopy_fee": 100,
    "expert_fee": 1000
  },
  {
    "title": "Junior Clerk",
    "department": "Ministry of Finance",
    "description": "Office administration and clerical work",
    "required_education_levels": ["intermediate", "bachelor"],
    "required_education_fields": ["bs_computer_science", "bcom"],
    "min_age": 18,
    "max_age": 35,
    "gender_requirement": "any",
    "provinces": ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad"],
    "domicile": null,
    "total_seats": 200,
    "last_date": "2026-04-01",
    "bank_challan_fee": 400,
    "post_office_fee": 150,
    "photocopy_fee": 50,
    "expert_fee": 800
  },
  {
    "title": "Data Entry Operator",
    "department": "NADRA",
    "description": "Data entry and verification",
    "required_education_levels": ["intermediate"],
    "min_age": 18,
    "max_age": 30,
    "gender_requirement": "any",
    "provinces": ["Punjab"],
    "domicile": null,
    "total_seats": 100,
    "last_date": "2026-04-15",
    "bank_challan_fee": 300,
    "post_office_fee": 100,
    "photocopy_fee": 50,
    "expert_fee": 600
  }
]`;

const buildValidationSets = (validationOptions?: ValidationOptions) => {
  const validEducationValues =
    validationOptions?.educationLevels.map((e) => e.value.toLowerCase()) || [];
  const validProvinceValues = validationOptions?.provinces.map((p) => p.value) || [];
  const validEducationFields = validationOptions?.educationFields || [];

  return { validEducationValues, validProvinceValues, validEducationFields };
};

const finalizeJobWithValidation = (
  rawJobData: Partial<ParsedJob>,
  rawData: {
    educationLevels?: string[];
    educationFields?: string[];
    gender?: string;
    provinces?: string[];
  },
  index: number,
  validationOptions?: ValidationOptions,
  seenMissingFields?: Set<string>,
  missingEducationFields?: MissingEducationField[],
  errors?: string[],
  skippedJobs?: { title: string; reasons: string[] }[]
) => {
  const jobData: Partial<ParsedJob> = { ...rawJobData };

  const jobTitle = jobData.title || `Job ${index + 1}`;
  const validationErrors: string[] = [];

  if (!jobData.title) {
    errors?.push(`Job ${index + 1}: Missing title`);
    return;
  }
  if (!jobData.department) {
    errors?.push(`Job ${index + 1}: Missing department`);
    return;
  }
  if (!jobData.required_education_levels || jobData.required_education_levels.length === 0) {
    errors?.push(`Job ${index + 1}: Missing education levels`);
    return;
  }
  if (!jobData.last_date) {
    errors?.push(`Job ${index + 1}: Missing last date`);
    return;
  }

  if (validationOptions) {
    const { validEducationValues, validProvinceValues, validEducationFields } =
      buildValidationSets(validationOptions);

    if (jobData.required_education_levels) {
      const invalidEducation: string[] = [];
      const validEducation: string[] = [];

      jobData.required_education_levels.forEach((edu, i) => {
        if (validEducationValues.includes(edu.toLowerCase())) {
          validEducation.push(edu);
        } else {
          invalidEducation.push(rawData.educationLevels?.[i] || edu);
        }
      });

      if (invalidEducation.length > 0) {
        validationErrors.push(`Invalid education level(s): ${invalidEducation.join(", ")}`);
      }

      jobData.required_education_levels = validEducation;
    }

    if (jobData.required_education_fields && jobData.required_education_fields.length > 0) {
      const invalidFields: string[] = [];
      const validFieldIds: string[] = [];

      jobData.required_education_fields.forEach((fieldName, i) => {
        const matchedField = validEducationFields.find(
          (f) =>
            f.name.toLowerCase() === fieldName.toLowerCase() ||
            f.display_name.toLowerCase() === fieldName.toLowerCase()
        );

        if (matchedField) {
          validFieldIds.push(matchedField.id);
        } else {
          const rawFieldName = rawData.educationFields?.[i] || fieldName;
          invalidFields.push(rawFieldName);

          if (seenMissingFields && missingEducationFields && !seenMissingFields.has(rawFieldName.toLowerCase())) {
            seenMissingFields.add(rawFieldName.toLowerCase());
            const suggestedLevel = jobData.required_education_levels?.[0] || "bachelor";
            missingEducationFields.push({
              name: rawFieldName,
              suggestedLevel: suggestedLevel,
            });
          }
        }
      });

      if (invalidFields.length > 0) {
        validationErrors.push(
          `Missing education field(s): ${invalidFields.join(
            ", "
          )} — Please add these fields in "Manage Education" first`
        );
      }

      jobData.required_education_fields = validFieldIds.length > 0 ? validFieldIds : undefined;
    }

    if (rawData.gender && !VALID_GENDERS.includes(rawData.gender.toLowerCase())) {
      validationErrors.push(
        `Invalid gender: "${rawData.gender}" (use: male, female, other, any, or both)`
      );
    }

    if (jobData.provinces && jobData.provinces.length > 0) {
      const invalidProvinces: string[] = [];
      const validProvinces: string[] = [];

      jobData.provinces.forEach((prov) => {
        const matchedProvince = validProvinceValues.find(
          (vp) => vp.toLowerCase() === prov.toLowerCase()
        );
        if (matchedProvince) {
          validProvinces.push(matchedProvince);
        } else {
          invalidProvinces.push(prov);
        }
      });

      if (invalidProvinces.length > 0) {
        validationErrors.push(`Invalid province(s): ${invalidProvinces.join(", ")}`);
      }

      jobData.provinces = validProvinces;
    }
  }

  if (validationErrors.length > 0) {
    skippedJobs?.push({ title: jobTitle, reasons: validationErrors });
    return;
  }

  if (!jobData.required_education_levels || jobData.required_education_levels.length === 0) {
    skippedJobs?.push({
      title: jobTitle,
      reasons: ["No valid education levels after validation"],
    });
    return;
  }

  return {
    title: jobData.title!,
    department: jobData.department!,
    description: jobData.description,
    required_education_levels: jobData.required_education_levels,
    required_education_fields: jobData.required_education_fields,
    min_age: jobData.min_age || 18,
    max_age: jobData.max_age || 35,
    gender_requirement: jobData.gender_requirement ?? null,
    provinces: jobData.provinces,
    domicile: jobData.domicile,
    total_seats: jobData.total_seats || 1,
    last_date: jobData.last_date!,
    bank_challan_fee: jobData.bank_challan_fee || 0,
    post_office_fee: jobData.post_office_fee || 0,
    photocopy_fee: jobData.photocopy_fee || 0,
    expert_fee: jobData.expert_fee || 0,
  } as ParsedJob;
};

export const parseJobsFromText = (
  text: string,
  validationOptions?: ValidationOptions
): {
  jobs: ParsedJob[];
  errors: string[];
  skippedJobs: { title: string; reasons: string[] }[];
  missingEducationFields: MissingEducationField[];
} => {
  const jobs: ParsedJob[] = [];
  const errors: string[] = [];
  const skippedJobs: { title: string; reasons: string[] }[] = [];
  const missingEducationFields: MissingEducationField[] = [];
  const seenMissingFields = new Set<string>();

  // Split by "Title:" - each job block starts with "Title:"
  const normalizedText = text.trim();
  const jobBlocks: string[] = [];
  
  // Split on lines that start with "Title:" (case-insensitive)
  const lines = normalizedText.split('\n');
  let currentBlock = '';
  
  lines.forEach((line) => {
    if (line.trim().toLowerCase().startsWith('title:')) {
      if (currentBlock.trim()) {
        jobBlocks.push(currentBlock.trim());
      }
      currentBlock = line;
    } else {
      currentBlock += '\n' + line;
    }
  });
  
  // Don't forget the last block
  if (currentBlock.trim()) {
    jobBlocks.push(currentBlock.trim());
  }
  
  jobBlocks.forEach((block, index) => {
    try {
      const blockLines = block.trim().split('\n');
      const jobData: Partial<ParsedJob> = {};
      const rawData: { 
        educationLevels?: string[]; 
        educationFields?: string[];
        gender?: string; 
        provinces?: string[] 
      } = {};
      
      blockLines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) return;
        
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        
        switch (key) {
          case 'title':
            jobData.title = value;
            break;
          case 'department':
            jobData.department = value;
            break;
          case 'description':
            jobData.description = value;
            break;
          case 'education level':
          case 'education levels':
          case 'education':
            rawData.educationLevels = value.split(',').map(e => e.trim());
            jobData.required_education_levels = value.split(',').map(e => e.trim().toLowerCase().replace(/\s+/g, '_'));
            break;
          case 'education field':
          case 'education fields':
          case 'specialization':
          case 'specializations':
            rawData.educationFields = value.split(',').map(e => e.trim());
            jobData.required_education_fields = value.split(',').map(e => e.trim().toLowerCase().replace(/\s+/g, '_'));
            break;
          case 'min age':
            jobData.min_age = parseInt(value) || 18;
            break;
          case 'max age':
            jobData.max_age = parseInt(value) || 35;
            break;
          case 'gender':
            rawData.gender = value;
            if (value.toLowerCase() === 'any' || value.toLowerCase() === 'both') {
              jobData.gender_requirement = null;
            } else if (['male', 'female', 'other'].includes(value.toLowerCase())) {
              jobData.gender_requirement = value.toLowerCase() as "male" | "female" | "other";
            }
            break;
          case 'provinces':
            rawData.provinces = value.split(',').map(p => p.trim());
            jobData.provinces = value.split(',').map(p => p.trim());
            break;
          case 'domicile':
            jobData.domicile = value;
            break;
          case 'total seats':
            jobData.total_seats = parseInt(value) || 1;
            break;
          case 'last date':
            jobData.last_date = value;
            break;
          case 'bank challan fee':
            jobData.bank_challan_fee = parseInt(value) || 0;
            break;
          case 'post office fee':
            jobData.post_office_fee = parseInt(value) || 0;
            break;
          case 'photocopy fee':
            jobData.photocopy_fee = parseInt(value) || 0;
            break;
          case 'expert fee':
            jobData.expert_fee = parseInt(value) || 0;
            break;
        }
      });
      const finalized = finalizeJobWithValidation(
        jobData,
        rawData,
        index,
        validationOptions,
        seenMissingFields,
        missingEducationFields,
        errors,
        skippedJobs
      );

      if (finalized) {
        jobs.push(finalized);
      }
    } catch (e) {
      errors.push(`Job ${index + 1}: Failed to parse`);
    }
  });
  
  return { jobs, errors, skippedJobs, missingEducationFields };
};

export const parseJobsFromJson = (
  text: string,
  validationOptions?: ValidationOptions
): {
  jobs: ParsedJob[];
  errors: string[];
  skippedJobs: { title: string; reasons: string[] }[];
  missingEducationFields: MissingEducationField[];
} => {
  const jobs: ParsedJob[] = [];
  const errors: string[] = [];
  const skippedJobs: { title: string; reasons: string[] }[] = [];
  const missingEducationFields: MissingEducationField[] = [];
  const seenMissingFields = new Set<string>();

  if (!text.trim()) {
    return { jobs, errors, skippedJobs, missingEducationFields };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e: any) {
    errors.push(`Invalid JSON: ${e.message || "Failed to parse"}`);
    return { jobs, errors, skippedJobs, missingEducationFields };
  }

  if (!Array.isArray(parsed)) {
    errors.push("JSON must be an array of job objects");
    return { jobs, errors, skippedJobs, missingEducationFields };
  }

  (parsed as any[]).forEach((item, index) => {
    try {
      const raw = item || {};

      const rawData: {
        educationLevels?: string[];
        educationFields?: string[];
        gender?: string;
        provinces?: string[];
      } = {};

      const jobData: Partial<ParsedJob> = {};

      if (typeof raw.title === "string") {
        jobData.title = raw.title.trim();
      }
      if (typeof raw.department === "string") {
        jobData.department = raw.department.trim();
      }
      if (typeof raw.description === "string") {
        jobData.description = raw.description.trim();
      }

      if (Array.isArray(raw.required_education_levels)) {
        rawData.educationLevels = raw.required_education_levels.map((e: any) => String(e).trim());
        jobData.required_education_levels = raw.required_education_levels.map((e: any) =>
          String(e).trim().toLowerCase().replace(/\s+/g, "_")
        );
      }

      if (Array.isArray(raw.required_education_fields)) {
        rawData.educationFields = raw.required_education_fields.map((e: any) => String(e).trim());
        jobData.required_education_fields = raw.required_education_fields.map((e: any) =>
          String(e).trim().toLowerCase().replace(/\s+/g, "_")
        );
      }

      if (raw.min_age !== undefined) {
        const n = parseInt(String(raw.min_age), 10);
        jobData.min_age = Number.isNaN(n) ? 18 : n;
      }
      if (raw.max_age !== undefined) {
        const n = parseInt(String(raw.max_age), 10);
        jobData.max_age = Number.isNaN(n) ? 35 : n;
      }

      if (raw.gender_requirement !== undefined && raw.gender_requirement !== null) {
        const g = String(raw.gender_requirement).trim();
        rawData.gender = g;
        if (g.toLowerCase() === "any" || g.toLowerCase() === "both") {
          jobData.gender_requirement = null;
        } else if (["male", "female", "other"].includes(g.toLowerCase())) {
          jobData.gender_requirement = g.toLowerCase() as "male" | "female" | "other";
        }
      }

      if (Array.isArray(raw.provinces)) {
        rawData.provinces = raw.provinces.map((p: any) => String(p).trim());
        jobData.provinces = raw.provinces.map((p: any) => String(p).trim());
      }

      if (raw.domicile !== undefined && raw.domicile !== null) {
        jobData.domicile = String(raw.domicile).trim();
      }

      if (raw.total_seats !== undefined) {
        const n = parseInt(String(raw.total_seats), 10);
        jobData.total_seats = Number.isNaN(n) ? 1 : n;
      }

      if (typeof raw.last_date === "string") {
        jobData.last_date = raw.last_date.trim();
      }

      if (raw.bank_challan_fee !== undefined) {
        const n = parseInt(String(raw.bank_challan_fee), 10);
        jobData.bank_challan_fee = Number.isNaN(n) ? 0 : n;
      }
      if (raw.post_office_fee !== undefined) {
        const n = parseInt(String(raw.post_office_fee), 10);
        jobData.post_office_fee = Number.isNaN(n) ? 0 : n;
      }
      if (raw.photocopy_fee !== undefined) {
        const n = parseInt(String(raw.photocopy_fee), 10);
        jobData.photocopy_fee = Number.isNaN(n) ? 0 : n;
      }
      if (raw.expert_fee !== undefined) {
        const n = parseInt(String(raw.expert_fee), 10);
        jobData.expert_fee = Number.isNaN(n) ? 0 : n;
      }

      const finalized = finalizeJobWithValidation(
        jobData,
        rawData,
        index,
        validationOptions,
        seenMissingFields,
        missingEducationFields,
        errors,
        skippedJobs
      );

      if (finalized) {
        jobs.push(finalized);
      }
    } catch (e) {
      errors.push(`Job ${index + 1}: Failed to parse`);
    }
  });

  return { jobs, errors, skippedJobs, missingEducationFields };
};

export const useBulkCreateJobs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobs: ParsedJob[]) => {
      const { data, error } = await supabase
        .from("jobs")
        .insert(jobs)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["all-jobs"] });
      toast.success(`Successfully created ${data.length} jobs!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
