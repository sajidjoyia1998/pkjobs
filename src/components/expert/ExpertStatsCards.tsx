import { Briefcase, Clock, CheckCircle, DollarSign } from "lucide-react";
import { ExpertAssignment } from "@/hooks/useExpertAssignments";

interface ExpertStatsCardsProps {
  assignments: ExpertAssignment[];
}

const ExpertStatsCards = ({ assignments }: ExpertStatsCardsProps) => {
  const activeAssignments = assignments.filter(
    (a) => !["completed", "applied"].includes(a.status)
  );
  const completedAssignments = assignments.filter(
    (a) => ["completed", "applied"].includes(a.status)
  );
  const totalEarnings = completedAssignments.reduce(
    (sum, a) => sum + (Number(a.payment_amount) || 0),
    0
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <div className="stat-card">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{assignments.length}</p>
            <p className="text-xs text-muted-foreground">Total Assigned</p>
          </div>
        </div>
      </div>
      <div className="stat-card">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-info" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{activeAssignments.length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
        </div>
      </div>
      <div className="stat-card">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{completedAssignments.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
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
  );
};

export default ExpertStatsCards;
