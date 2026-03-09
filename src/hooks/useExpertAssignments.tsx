import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ExpertAssignment {
  id: string;
  type: "application" | "work_request";
  status: string;
  payment_amount: number | null;
  notes: string | null;
  created_at: string;
  user_id: string;
  custom_description?: string;
  job?: {
    id: string;
    title: string;
    department: string;
    total_fee: number;
    last_date: string;
  };
  category?: {
    display_name: string;
  };
  profile?: {
    full_name: string;
    phone: string | null;
    province: string | null;
  };
}

export const useExpertAssignments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["expert-assignments", user?.id],
    queryFn: async (): Promise<ExpertAssignment[]> => {
      if (!user) return [];

      // Fetch assigned applications
      const { data: apps = [] } = await supabase
        .from("applications")
        .select("*, job:jobs(id, title, department, total_fee, last_date)")
        .eq("expert_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch assigned work requests
      const { data: wrs = [] } = await supabase
        .from("work_requests")
        .select("*, category:service_categories(display_name)")
        .eq("expert_id", user.id)
        .order("created_at", { ascending: false });

      // Get unique user IDs for profiles
      const userIds = [
        ...new Set([...apps.map((a) => a.user_id), ...wrs.map((w) => w.user_id)]),
      ];

      const { data: profiles = [] } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, province")
        .in("user_id", userIds);

      const profileMap = new Map(profiles.map((p) => [p.user_id, p]));

      const assignments: ExpertAssignment[] = [
        ...apps.map((a) => ({
          id: a.id,
          type: "application" as const,
          status: a.status,
          payment_amount: a.payment_amount,
          notes: a.notes,
          created_at: a.created_at,
          user_id: a.user_id,
          job: a.job as any,
          profile: profileMap.get(a.user_id) || { full_name: "Unknown", phone: null, province: null },
        })),
        ...wrs.map((w) => ({
          id: w.id,
          type: "work_request" as const,
          status: w.status,
          payment_amount: w.payment_amount,
          notes: w.notes,
          created_at: w.created_at,
          user_id: w.user_id,
          custom_description: w.custom_description,
          category: w.category as any,
          profile: profileMap.get(w.user_id) || { full_name: "Unknown", phone: null, province: null },
        })),
      ];

      return assignments.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!user,
  });
};
