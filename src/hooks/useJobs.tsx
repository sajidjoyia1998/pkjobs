import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Job {
  id: string;
  title: string;
  department: string;
  description: string | null;
  required_education_levels: string[];
  required_education_fields: string[] | null;
  min_age: number;
  max_age: number;
  gender_requirement: "male" | "female" | "other" | null;
  provinces: string[];
  domicile: string | null;
  total_seats: number;
  last_date: string;
  bank_challan_fee: number;
  post_office_fee: number;
  photocopy_fee: number;
  expert_fee: number;
  total_fee: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  advertisement_link: string | null;
  advertisement_image: string | null;
  test_preparation_available: boolean;
}

// Helper to normalize job data (handle null arrays from DB)
const normalizeJob = (job: any): Job => ({
  ...job,
  required_education_levels: job.required_education_levels || [],
  required_education_fields: job.required_education_fields || null,
  provinces: job.provinces || [],
});

export interface CreateJobInput {
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
  advertisement_link?: string;
  advertisement_image?: string;
  test_preparation_available?: boolean;
}

export const useJobs = (filters?: {
  search?: string;
  province?: string;
  education?: string;
}) => {
  return useQuery({
    queryKey: ["jobs", filters],
    queryFn: async () => {
      let query = supabase
        .from("jobs")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (filters?.search) {
        const safe = filters.search
          .replace(/[\\%_*]/g, "\\$&")
          .replace(/[,()]/g, " ")
          .trim();
        if (safe) {
          query = query.or(
            `title.ilike.%${safe}%,department.ilike.%${safe}%`
          );
        }
      }

      if (filters?.province && filters.province !== "all") {
        query = query.contains("provinces", [filters.province]);
      }

      if (filters?.education && filters.education !== "all") {
        query = query.contains("required_education_levels", [filters.education]);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(normalizeJob);
    },
  });
};

export const useJob = (id: string | undefined) => {
  return useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return normalizeJob(data);
    },
    enabled: !!id,
  });
};

export const useAllJobs = () => {
  return useQuery({
    queryKey: ["all-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(normalizeJob);
    },
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJobInput) => {
      const { data, error } = await supabase
        .from("jobs")
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["all-jobs"] });
      toast.success("Job created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["all-jobs"] });
      toast.success("Job deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUpdateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateJobInput> }) => {
      const { data, error } = await supabase
        .from("jobs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["all-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job"] });
      toast.success("Job updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useToggleJobStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("jobs")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["all-jobs"] });
      toast.success("Job status updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};