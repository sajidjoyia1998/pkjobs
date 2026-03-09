import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExpertUser {
  user_id: string;
  full_name: string;
}

export const useExpertUsers = () => {
  return useQuery({
    queryKey: ["expert-users"],
    queryFn: async () => {
      // Get all users with expert role
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "expert");

      if (error) throw error;
      if (!roles?.length) return [];

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      return (profiles || []) as ExpertUser[];
    },
  });
};

export const useAssignExpertRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Check if already has expert role
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "expert")
        .single();

      if (existing) throw new Error("User already has expert role");

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "expert" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expert-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Expert role assigned!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
};

export const useRemoveExpertRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "expert");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expert-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Expert role removed!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
};

export const useUserRoles = () => {
  return useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (error) throw error;
      
      // Build a map: userId -> roles[]
      const roleMap = new Map<string, string[]>();
      for (const row of data || []) {
        const existing = roleMap.get(row.user_id) || [];
        existing.push(row.role);
        roleMap.set(row.user_id, existing);
      }
      return roleMap;
    },
  });
};
