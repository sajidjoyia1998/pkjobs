import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EducationField {
  id: string;
  education_level: string;
  name: string;
  display_name: string;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

export interface UserEducation {
  id: string;
  user_id: string;
  education_level: string;
  education_field_id: string | null;
  education_field?: EducationField;
  created_at: string;
}

// Fetch all education fields
export const useEducationFields = () => {
  return useQuery({
    queryKey: ["education-fields"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("education_fields")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("display_name", { ascending: true });

      if (error) throw error;
      return data as EducationField[];
    },
  });
};

// Fetch education fields by level
export const useEducationFieldsByLevel = (level: string) => {
  return useQuery({
    queryKey: ["education-fields", level],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("education_fields")
        .select("*")
        .eq("education_level", level)
        .order("sort_order", { ascending: true })
        .order("display_name", { ascending: true });

      if (error) throw error;
      return data as EducationField[];
    },
    enabled: !!level,
  });
};

// Fetch user's education entries
export const useUserEducations = (userId?: string) => {
  return useQuery({
    queryKey: ["user-educations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_educations")
        .select(`
          *,
          education_field:education_fields(*)
        `)
        .eq("user_id", userId!);

      if (error) throw error;
      return data as (UserEducation & { education_field: EducationField | null })[];
    },
    enabled: !!userId,
  });
};

// Add education field (admin)
export const useAddEducationField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      education_level,
      name,
      display_name,
    }: {
      education_level: string;
      name: string;
      display_name: string;
    }) => {
      const { data, error } = await supabase
        .from("education_fields")
        .insert([{ education_level, name, display_name }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["education-fields"] });
      toast.success("Education field added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Delete education field (admin)
export const useDeleteEducationField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("education_fields")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["education-fields"] });
      toast.success("Education field deleted!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Update education field sort orders
export const useUpdateFieldSortOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("education_fields")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["education-fields"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useAddUserEducation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user_id,
      education_level,
      education_field_id,
    }: {
      user_id: string;
      education_level: string;
      education_field_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("user_educations")
        .insert([{ user_id, education_level, education_field_id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-educations", variables.user_id] });
      toast.success("Education added!");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("This education entry already exists");
      } else {
        toast.error(error.message);
      }
    },
  });
};

// Delete user education entry
export const useDeleteUserEducation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, user_id }: { id: string; user_id: string }) => {
      const { error } = await supabase
        .from("user_educations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { user_id };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-educations", variables.user_id] });
      toast.success("Education removed!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Bulk set user educations (replace all)
export const useSetUserEducations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user_id,
      educations,
    }: {
      user_id: string;
      educations: { education_level: string; education_field_id?: string | null }[];
    }) => {
      // First delete all existing
      const { error: deleteError } = await supabase
        .from("user_educations")
        .delete()
        .eq("user_id", user_id);

      if (deleteError) throw deleteError;

      // Then insert new ones
      if (educations.length > 0) {
        const { error: insertError } = await supabase
          .from("user_educations")
          .insert(
            educations.map((e) => ({
              user_id,
              education_level: e.education_level,
              education_field_id: e.education_field_id || null,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-educations", variables.user_id] });
      toast.success("Education updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
