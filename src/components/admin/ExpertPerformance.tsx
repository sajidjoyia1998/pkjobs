import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, Briefcase, DollarSign, TrendingUp } from "lucide-react";

interface ExpertStats {
  user_id: string;
  full_name: string;
  total_assigned: number;
  completed: number;
  in_progress: number;
  total_earnings: number;
}

const useExpertPerformance = () => {
  return useQuery({
    queryKey: ["admin-expert-performance"],
    queryFn: async () => {
      // Get all experts
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "expert");

      if (!roles?.length) return [];

      const expertIds = roles.map((r) => r.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", expertIds);

      // Get all applications assigned to experts
      const { data: apps } = await supabase
        .from("applications")
        .select("expert_id, status, payment_amount")
        .in("expert_id", expertIds);

      // Get all work requests assigned to experts
      const { data: wrs } = await supabase
        .from("work_requests")
        .select("expert_id, status, payment_amount")
        .in("expert_id", expertIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p.full_name])
      );

      const statsMap = new Map<string, ExpertStats>();

      for (const id of expertIds) {
        statsMap.set(id, {
          user_id: id,
          full_name: profileMap.get(id) || "Unknown",
          total_assigned: 0,
          completed: 0,
          in_progress: 0,
          total_earnings: 0,
        });
      }

      for (const app of apps || []) {
        if (!app.expert_id) continue;
        const s = statsMap.get(app.expert_id);
        if (!s) continue;
        s.total_assigned++;
        if (["completed", "applied"].includes(app.status)) {
          s.completed++;
          s.total_earnings += Number(app.payment_amount) || 0;
        } else {
          s.in_progress++;
        }
      }

      for (const wr of wrs || []) {
        if (!wr.expert_id) continue;
        const s = statsMap.get(wr.expert_id);
        if (!s) continue;
        s.total_assigned++;
        if (["completed", "applied"].includes(wr.status)) {
          s.completed++;
          s.total_earnings += Number(wr.payment_amount) || 0;
        } else {
          s.in_progress++;
        }
      }

      return Array.from(statsMap.values()).sort(
        (a, b) => b.total_assigned - a.total_assigned
      );
    },
  });
};

const ExpertPerformance = () => {
  const { data: experts = [], isLoading } = useExpertPerformance();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (experts.length === 0) {
    return (
      <div className="card-elevated p-8 text-center">
        <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Experts Yet</h3>
        <p className="text-muted-foreground">
          Assign the expert role to users from the Users tab.
        </p>
      </div>
    );
  }

  const totalEarnings = experts.reduce((s, e) => s + e.total_earnings, 0);
  const totalCompleted = experts.reduce((s, e) => s + e.completed, 0);
  const totalActive = experts.reduce((s, e) => s + e.in_progress, 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{experts.length}</p>
              <p className="text-xs text-muted-foreground">Total Experts</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{totalActive}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-secondary/50 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                Rs. {totalEarnings.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Earnings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expert Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Expert</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Assigned</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Active</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Completed</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Earnings</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Rate</th>
              </tr>
            </thead>
            <tbody>
              {experts.map((expert) => {
                const completionRate =
                  expert.total_assigned > 0
                    ? Math.round((expert.completed / expert.total_assigned) * 100)
                    : 0;
                return (
                  <tr key={expert.user_id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {expert.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-foreground">{expert.full_name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center text-foreground">{expert.total_assigned}</td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="text-info border-info/30">
                        {expert.in_progress}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="text-success border-success/30">
                        {expert.completed}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-medium text-foreground">
                      Rs. {expert.total_earnings.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        className={
                          completionRate >= 80
                            ? "bg-success"
                            : completionRate >= 50
                            ? "bg-warning"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {completionRate}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpertPerformance;
