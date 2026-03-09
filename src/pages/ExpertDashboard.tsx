import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Briefcase,
  User,
  MessageSquare,
  Loader2,
  FileText,
  Clock,
  CheckCircle,
  MapPin,
  Phone,
  Calendar,
  Eye,
  Download,
  FileImage,
  File,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useExpertAssignments, ExpertAssignment } from "@/hooks/useExpertAssignments";
import { useUpdateApplicationStatus } from "@/hooks/useApplications";
import { useUpdateWorkRequestStatus } from "@/hooks/useWorkRequests";
import { openApplicationChat } from "@/components/chat/ChatWidget";
import { toast } from "sonner";
import ExpertStatsCards from "@/components/expert/ExpertStatsCards";

const statusLabels: Record<string, string> = {
  pending: "Pending",
  payment_received: "Payment Received",
  expert_assigned: "Expert Assigned",
  in_progress: "In Progress",
  applied: "Applied",
  completed: "Completed",
};

const statusProgress: Record<string, number> = {
  pending: 10,
  payment_received: 25,
  expert_assigned: 40,
  in_progress: 60,
  applied: 90,
  completed: 100,
};

interface UserDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

const useExpertDocuments = (userIds: string[]) => {
  return useQuery({
    queryKey: ["expert-user-documents", userIds],
    queryFn: async () => {
      if (!userIds.length) return new Map<string, UserDocument[]>();

      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const docMap = new Map<string, UserDocument[]>();
      for (const doc of data || []) {
        const existing = docMap.get(doc.user_id) || [];
        existing.push(doc as UserDocument);
        docMap.set(doc.user_id, existing);
      }
      return docMap;
    },
    enabled: userIds.length > 0,
  });
};

const ExpertDashboard = () => {
  const { profile } = useAuth();
  const { data: assignments = [], isLoading } = useExpertAssignments();
  const [activeTab, setActiveTab] = useState("assigned");

  const userIds = [...new Set(assignments.map((a) => a.user_id))];
  const { data: documentsMap = new Map() } = useExpertDocuments(userIds);

  const activeAssignments = assignments.filter(
    (a) => !["completed", "applied"].includes(a.status)
  );
  const completedAssignments = assignments.filter(
    (a) => ["completed", "applied"].includes(a.status)
  );

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-8">
      <div className="container px-4 sm:px-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            Expert Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome, {profile?.full_name || "Expert"}. Manage your assigned applications.
          </p>
        </div>

        {/* Stats */}
        <ExpertStatsCards assignments={assignments} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="assigned" className="gap-1.5">
              <Briefcase className="h-4 w-4" /> Active ({activeAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5">
              <CheckCircle className="h-4 w-4" /> Completed ({completedAssignments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assigned">
            {activeAssignments.length === 0 ? (
              <div className="card-elevated p-8 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Active Assignments</h3>
                <p className="text-muted-foreground">You'll see assigned applications here once admin assigns them to you.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeAssignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    documents={documentsMap.get(assignment.user_id) || []}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedAssignments.length === 0 ? (
              <div className="card-elevated p-8 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No completed assignments yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedAssignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    documents={documentsMap.get(assignment.user_id) || []}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const getDocIcon = (type: string) => {
  if (type.includes("image") || type.includes("photo") || type.includes("cnic")) {
    return <FileImage className="h-4 w-4 text-info" />;
  }
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const AssignmentCard = ({
  assignment,
  documents,
}: {
  assignment: ExpertAssignment;
  documents: UserDocument[];
}) => {
  const updateAppStatus = useUpdateApplicationStatus();
  const updateWrStatus = useUpdateWorkRequestStatus();
  const [viewingProfile, setViewingProfile] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);

  const statusColors: Record<string, string> = {
    pending: "bg-warning",
    payment_received: "bg-info",
    expert_assigned: "bg-info",
    in_progress: "bg-primary",
    applied: "bg-success",
    completed: "bg-success",
  };

  const handleStatusChange = (newStatus: string) => {
    if (assignment.type === "application") {
      updateAppStatus.mutate({ id: assignment.id, status: newStatus as any });
    } else {
      updateWrStatus.mutate({ id: assignment.id, status: newStatus as any });
    }
  };

  const handleDownload = (doc: UserDocument) => {
    window.open(doc.file_url, "_blank");
  };

  return (
    <>
      <div className="card-elevated p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {assignment.type === "application"
                    ? assignment.job?.title || "Job Application"
                    : assignment.category?.display_name || "Work Request"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {assignment.type === "application"
                    ? assignment.job?.department
                    : assignment.custom_description}
                </p>
                {assignment.type === "application" && assignment.job?.last_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Last Date: {new Date(assignment.job.last_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Badge className={statusColors[assignment.status] || "bg-muted"}>
                {statusLabels[assignment.status] || assignment.status}
              </Badge>
            </div>

            {/* Applicant Info */}
            {assignment.profile && (
              <div className="bg-muted/50 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {assignment.profile.full_name}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 ml-6 mt-1">
                      {assignment.profile.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {assignment.profile.phone}
                        </p>
                      )}
                      {assignment.profile.province && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {assignment.profile.province}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setViewingProfile(true)}>
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                </div>
              </div>
            )}

            {/* Documents Section */}
            {documents.length > 0 && (
              <Collapsible open={docsOpen} onOpenChange={setDocsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 mb-2 w-full justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      User Documents ({documents.length})
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${docsOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mb-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getDocIcon(doc.document_type)}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {doc.file_name}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {doc.document_type.replace(/_/g, " ")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(doc.file_url, "_blank")}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{statusProgress[assignment.status] || 0}%</span>
              </div>
              <Progress value={statusProgress[assignment.status] || 0} className="h-2" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 lg:min-w-[200px]">
            {assignment.payment_amount && (
              <div className="text-sm text-muted-foreground">
                Fee: <span className="font-medium text-foreground">Rs. {Number(assignment.payment_amount).toLocaleString()}</span>
              </div>
            )}

            {/* Status Update */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Update Status</label>
              <Select value={assignment.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expert_assigned">Expert Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              {assignment.type === "application" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1"
                  onClick={() => openApplicationChat(assignment.id, assignment.job?.title || "Application")}
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </Button>
              )}
              {assignment.notes && (
                <Button variant="ghost" size="sm" title={assignment.notes} onClick={() => toast.info(assignment.notes || "")}>
                  <FileText className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Detail Dialog */}
      <Dialog open={viewingProfile} onOpenChange={setViewingProfile}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Applicant Profile</DialogTitle>
          </DialogHeader>
          {assignment.profile && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium text-sm">{assignment.profile.full_name}</p>
                </div>
              </div>
              {assignment.profile.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium text-sm">{assignment.profile.phone}</p>
                  </div>
                </div>
              )}
              {assignment.profile.province && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Province</p>
                    <p className="font-medium text-sm">{assignment.profile.province}</p>
                  </div>
                </div>
              )}
              {assignment.type === "application" && assignment.job && (
                <div className="border-t border-border pt-3 mt-3">
                  <h4 className="text-sm font-medium text-foreground mb-2">Job Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Title:</span> {assignment.job.title}</p>
                    <p><span className="text-muted-foreground">Department:</span> {assignment.job.department}</p>
                    <p><span className="text-muted-foreground">Last Date:</span> {new Date(assignment.job.last_date).toLocaleDateString()}</p>
                    <p><span className="text-muted-foreground">Total Fee:</span> Rs. {Number(assignment.job.total_fee).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Documents in profile dialog */}
              {documents.length > 0 && (
                <div className="border-t border-border pt-3 mt-3">
                  <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Documents ({documents.length})
                  </h4>
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2 min-w-0">
                          {getDocIcon(doc.document_type)}
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{doc.document_type.replace(/_/g, " ")}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => window.open(doc.file_url, "_blank")}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpertDashboard;
