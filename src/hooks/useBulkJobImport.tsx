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

export const BULK_JOB_SAMPLE = `Title: Assistant Sub Inspector
Department: Punjab Police
Description: Assist in maintaining law and order
Education Level: matric, intermediate
Education Field: science, arts
Min Age: 18
Max Age: 30
Gender: male
Provinces: Punjab, Sindh
Domicile: Punjab
Total Seats: 500
Last Date: 2026-03-15
Bank Challan Fee: 500
Post Office Fee: 200
Photocopy Fee: 100
Expert Fee: 1000

Title: Junior Clerk
Department: Ministry of Finance
Description: Office administration and clerical work
Education Level: intermediate, bachelor
Education Field: bs_computer_science, bcom
Min Age: 18
Max Age: 35
Gender: any
Provinces: Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan, Islamabad
Total Seats: 200
Last Date: 2026-04-01
Bank Challan Fee: 400
Post Office Fee: 150
Photocopy Fee: 50
Expert Fee: 800

Title: Data Entry Operator
Department: NADRA
Description: Data entry and verification
Education Level: intermediate
Min Age: 18
Max Age: 30
Gender: any
Provinces: Punjab
Total Seats: 100
Last Date: 2026-04-15
Bank Challan Fee: 300
Post Office Fee: 100
Photocopy Fee: 50
Expert Fee: 600`;

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
  
  // Build validation sets
  const validEducationValues = validationOptions?.educationLevels.map(e => e.value.toLowerCase()) || [];
  const validProvinceValues = validationOptions?.provinces.map(p => p.value) || [];
  const validEducationFields = validationOptions?.educationFields || [];
  
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
      
      const jobTitle = jobData.title || `Job ${index + 1}`;
      const validationErrors: string[] = [];
      
      // Validate required fields
      if (!jobData.title) {
        errors.push(`Job ${index + 1}: Missing title`);
        return;
      }
      if (!jobData.department) {
        errors.push(`Job ${index + 1}: Missing department`);
        return;
      }
      if (!jobData.required_education_levels || jobData.required_education_levels.length === 0) {
        errors.push(`Job ${index + 1}: Missing education levels`);
        return;
      }
      if (!jobData.last_date) {
        errors.push(`Job ${index + 1}: Missing last date`);
        return;
      }
      
      // Validate education levels against available options
      if (validationOptions && jobData.required_education_levels) {
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
          validationErrors.push(`Invalid education level(s): ${invalidEducation.join(', ')}`);
        }
        
        // Update to only valid education levels
        jobData.required_education_levels = validEducation;
      }
      
      // Validate education fields/specializations
      if (validationOptions && jobData.required_education_fields && jobData.required_education_fields.length > 0) {
        const invalidFields: string[] = [];
        const validFieldIds: string[] = [];
        
        jobData.required_education_fields.forEach((fieldName, i) => {
          // Find the field by name (case-insensitive)
          const matchedField = validEducationFields.find(
            f => f.name.toLowerCase() === fieldName.toLowerCase() ||
                 f.display_name.toLowerCase() === fieldName.toLowerCase()
          );
          
          if (matchedField) {
            validFieldIds.push(matchedField.id);
          } else {
            const rawFieldName = rawData.educationFields?.[i] || fieldName;
            invalidFields.push(rawFieldName);
            
            // Track missing fields for suggestion
            if (!seenMissingFields.has(rawFieldName.toLowerCase())) {
              seenMissingFields.add(rawFieldName.toLowerCase());
              // Suggest the first education level from the job if available
              const suggestedLevel = jobData.required_education_levels?.[0] || 'bachelor';
              missingEducationFields.push({
                name: rawFieldName,
                suggestedLevel: suggestedLevel,
              });
            }
          }
        });
        
        if (invalidFields.length > 0) {
          validationErrors.push(`Missing education field(s): ${invalidFields.join(', ')} — Please add these fields in "Manage Education" first`);
        }
        
        // Update to only valid field IDs
        jobData.required_education_fields = validFieldIds.length > 0 ? validFieldIds : undefined;
      }
      
      // Validate gender
      if (rawData.gender && !VALID_GENDERS.includes(rawData.gender.toLowerCase())) {
        validationErrors.push(`Invalid gender: "${rawData.gender}" (use: male, female, other, or any)`);
      }
      
      // Validate provinces against available options
      if (validationOptions && jobData.provinces && jobData.provinces.length > 0) {
        const invalidProvinces: string[] = [];
        const validProvinces: string[] = [];
        
        jobData.provinces.forEach(prov => {
          // Case-insensitive matching
          const matchedProvince = validProvinceValues.find(
            vp => vp.toLowerCase() === prov.toLowerCase()
          );
          if (matchedProvince) {
            validProvinces.push(matchedProvince);
          } else {
            invalidProvinces.push(prov);
          }
        });
        
        if (invalidProvinces.length > 0) {
          validationErrors.push(`Invalid province(s): ${invalidProvinces.join(', ')}`);
        }
        
        // Update to only valid provinces with correct casing
        jobData.provinces = validProvinces;
      }
      
      // If there are validation errors, skip this job
      if (validationErrors.length > 0) {
        skippedJobs.push({ title: jobTitle, reasons: validationErrors });
        return;
      }
      
      // Ensure we have at least one valid education level
      if (!jobData.required_education_levels || jobData.required_education_levels.length === 0) {
        skippedJobs.push({ 
          title: jobTitle, 
          reasons: ['No valid education levels after validation'] 
        });
        return;
      }
      
      jobs.push({
        title: jobData.title,
        department: jobData.department,
        description: jobData.description,
        required_education_levels: jobData.required_education_levels,
        required_education_fields: jobData.required_education_fields,
        min_age: jobData.min_age || 18,
        max_age: jobData.max_age || 35,
        gender_requirement: jobData.gender_requirement,
        provinces: jobData.provinces,
        domicile: jobData.domicile,
        total_seats: jobData.total_seats || 1,
        last_date: jobData.last_date,
        bank_challan_fee: jobData.bank_challan_fee || 0,
        post_office_fee: jobData.post_office_fee || 0,
        photocopy_fee: jobData.photocopy_fee || 0,
        expert_fee: jobData.expert_fee || 0,
      });
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
