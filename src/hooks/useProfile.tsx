import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

interface UpdateProfileInput {
  full_name?: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  province?: string;
  domicile?: string;
  phone?: string;
}

export const useUpdateProfile = () => {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      if (!user) throw new Error("You must be logged in");

      const { error } = await supabase
        .from("profiles")
        .update(input)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      toast.success("Profile updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export interface UserEducationEntry {
  id: string;
  user_id: string;
  education_level: string;
  education_field_id: string | null;
  created_at: string;
}

export const useUserEducations = (userId?: string) => {
  return useQuery({
    queryKey: ["user-educations", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_educations")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data as UserEducationEntry[];
    },
    enabled: !!userId,
  });
};

export const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

export const getEducationLevel = (education: string): number => {
  const levels: Record<string, number> = {
    matric: 1,
    intermediate: 2,
    bachelor: 3,
    master: 4,
    phd: 5,
  };
  return levels[education] || 0;
};

export const isEligibleForJob = (
  profile: { 
    date_of_birth: string | null; 
    gender: string | null; 
    education: string | null;
    province: string | null;
    domicile: string | null;
  },
  job: {
    min_age: number;
    max_age: number;
    gender_requirement: string | null;
    required_education_levels: string[] | null;
    required_education_fields: string[] | null;
    provinces: string[] | null;
    domicile: string | null;
  },
  userEducations?: UserEducationEntry[],
  allEducationFields?: { id: string; education_level: string }[]
): { eligible: boolean; reasons: string[] } => {
  const reasons: string[] = [];

  const requiredLevels = job.required_education_levels || [];
  const requiredFields = job.required_education_fields || [];
  const jobProvinces = job.provinces || [];

  // Check age
  if (profile.date_of_birth) {
    const age = calculateAge(profile.date_of_birth);
    if (age < job.min_age || age > job.max_age) {
      reasons.push(`Age requirement: ${job.min_age}-${job.max_age} years (your age: ${age})`);
    }
  }

  // Check gender
  if (job.gender_requirement && profile.gender && job.gender_requirement !== profile.gender) {
    reasons.push(`Gender requirement: ${job.gender_requirement} only`);
  }

  // --- Hierarchical education level check ---
  // User qualifies if they have ANY education level >= any of the required levels
  if (requiredLevels.length > 0) {
    const minRequiredRank = Math.min(...requiredLevels.map(getEducationLevel));

    if (userEducations && userEducations.length > 0) {
      const userMaxRank = Math.max(...userEducations.map(ue => getEducationLevel(ue.education_level)));
      if (userMaxRank < minRequiredRank) {
        reasons.push(`Education level requirement: ${requiredLevels.join(", ")}`);
      }
    } else if (profile.education) {
      const userRank = getEducationLevel(profile.education);
      if (userRank < minRequiredRank) {
        reasons.push(`Education level requirement: ${requiredLevels.join(", ")}`);
      }
    }
  }

  // --- Field-aware check ---
  // If job requires specific fields:
  //   - User passes if they have a matching field, OR
  //   - User passes if their education level is HIGHER than the level the required fields belong to
  if (requiredFields.length > 0) {
    let fieldEligible = false;

    if (userEducations && userEducations.length > 0) {
      // Check direct field match
      const hasMatchingField = userEducations.some(ue =>
        ue.education_field_id && requiredFields.includes(ue.education_field_id)
      );

      if (hasMatchingField) {
        fieldEligible = true;
      } else {
        // Check if user has a HIGHER level than the field's level (field-aware hierarchy)
        // Find the highest level among required fields
        let maxFieldLevel = 0;
        if (allEducationFields) {
          for (const fieldId of requiredFields) {
            const field = allEducationFields.find(f => f.id === fieldId);
            if (field) {
              maxFieldLevel = Math.max(maxFieldLevel, getEducationLevel(field.education_level));
            }
          }
        }

        if (maxFieldLevel > 0) {
          const userMaxRank = Math.max(...userEducations.map(ue => getEducationLevel(ue.education_level)));
          if (userMaxRank > maxFieldLevel) {
            fieldEligible = true;
          }
        }
      }
    }

    if (!fieldEligible) {
      reasons.push(`Education specialization requirement not met`);
    }
  }

  // Check province/domicile
  if (jobProvinces.length > 0 && profile.province) {
    const userProvince = profile.province.toLowerCase();
    const normalizedProvinces = jobProvinces.map(p => p.toLowerCase());
    if (!normalizedProvinces.some(p => p.includes("all") || p.includes(userProvince) || userProvince.includes(p))) {
      reasons.push(`Province requirement: ${jobProvinces.join(", ")}`);
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
};