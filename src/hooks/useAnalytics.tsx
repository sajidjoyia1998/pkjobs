import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO } from "date-fns";

interface AnalyticsData {
  totalUsers: number;
  totalApplications: number;
  totalRevenue: number;
  totalWorkRequests: number;
  dailySignups: { date: string; signups: number }[];
  applicationsPerJob: { name: string; count: number }[];
  dailyRevenue: { date: string; revenue: number }[];
  statusDistribution: { name: string; count: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  payment_received: "Payment Received",
  expert_assigned: "Expert Assigned",
  in_progress: "In Progress",
  applied: "Applied",
  completed: "Completed",
};

export const useAnalyticsData = () => {
  return useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async (): Promise<AnalyticsData> => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Fetch all data in parallel
      const [profilesRes, applicationsRes, workRequestsRes, jobsRes] = await Promise.all([
        supabase.from("profiles").select("created_at"),
        supabase.from("applications").select("created_at, status, payment_amount, job_id"),
        supabase.from("work_requests").select("id, payment_amount"),
        supabase.from("jobs").select("id, title"),
      ]);

      const profiles = profilesRes.data || [];
      const applications = applicationsRes.data || [];
      const workRequests = workRequestsRes.data || [];
      const jobs = jobsRes.data || [];

      // Total counts
      const totalUsers = profiles.length;
      const totalApplications = applications.length;
      const totalRevenue = applications.reduce((sum, a) => sum + (Number(a.payment_amount) || 0), 0) +
        workRequests.reduce((sum, w) => sum + (Number(w.payment_amount) || 0), 0);
      const totalWorkRequests = workRequests.length;

      // Daily signups (last 30 days)
      const dailySignupsMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const day = format(subDays(new Date(), i), "MMM dd");
        dailySignupsMap[day] = 0;
      }
      profiles.forEach((p) => {
        const day = format(parseISO(p.created_at), "MMM dd");
        if (day in dailySignupsMap) dailySignupsMap[day]++;
      });
      const dailySignups = Object.entries(dailySignupsMap).map(([date, signups]) => ({ date, signups }));

      // Applications per job (top 10)
      const jobCountMap: Record<string, number> = {};
      applications.forEach((a) => {
        jobCountMap[a.job_id] = (jobCountMap[a.job_id] || 0) + 1;
      });
      const jobNameMap = new Map(jobs.map((j) => [j.id, j.title]));
      const applicationsPerJob = Object.entries(jobCountMap)
        .map(([jobId, count]) => ({
          name: (jobNameMap.get(jobId) || "Unknown").substring(0, 20),
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Daily revenue (last 30 days)
      const dailyRevenueMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const day = format(subDays(new Date(), i), "MMM dd");
        dailyRevenueMap[day] = 0;
      }
      applications.forEach((a) => {
        const day = format(parseISO(a.created_at), "MMM dd");
        if (day in dailyRevenueMap) {
          dailyRevenueMap[day] += Number(a.payment_amount) || 0;
        }
      });
      const dailyRevenue = Object.entries(dailyRevenueMap).map(([date, revenue]) => ({ date, revenue }));

      // Status distribution
      const statusMap: Record<string, number> = {};
      applications.forEach((a) => {
        const label = STATUS_LABELS[a.status] || a.status;
        statusMap[label] = (statusMap[label] || 0) + 1;
      });
      const statusDistribution = Object.entries(statusMap).map(([name, count]) => ({ name, count }));

      return {
        totalUsers,
        totalApplications,
        totalRevenue,
        totalWorkRequests,
        dailySignups,
        applicationsPerJob,
        dailyRevenue,
        statusDistribution,
      };
    },
  });
};
