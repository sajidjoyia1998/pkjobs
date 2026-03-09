import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  User,
  Calendar,
  MapPin,
  Phone,
  GraduationCap,
  Briefcase,
  FileText,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { calculateAge } from "@/hooks/useProfile";

interface ChatUserProfileProps {
  userId: string;
  userName: string;
}

const useUserFullProfile = (userId: string) => {
  return useQuery({
    queryKey: ["admin-user-full-profile", userId],
    queryFn: async () => {
      const [profileRes, educationsRes, applicationsRes, documentsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("user_educations").select("*, education_field:education_fields(*)").eq("user_id", userId),
        supabase.from("applications").select("*, job:jobs(id, title, department, last_date)").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("user_documents").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      return {
        profile: profileRes.data,
        educations: educationsRes.data || [],
        applications: applicationsRes.data || [],
        documents: documentsRes.data || [],
      };
    },
    enabled: !!userId,
  });
};

const statusColors: Record<string, string> = {
  pending: "bg-warning",
  payment_received: "bg-info",
  expert_assigned: "bg-info",
  in_progress: "bg-info",
  applied: "bg-success",
  completed: "bg-success",
};

const ChatUserProfile = ({ userId, userName }: ChatUserProfileProps) => {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useUserFullProfile(userId);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <User className="h-3.5 w-3.5" />
          Profile
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {userName}
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !data?.profile ? (
            <div className="p-4 text-center text-muted-foreground">No profile found</div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Basic Info */}
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Personal Information
                </h3>
                <div className="space-y-2">
                  <InfoRow icon={<User className="h-4 w-4" />} label="Name" value={data.profile.full_name} />
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="DOB / Age"
                    value={data.profile.date_of_birth ? `${data.profile.date_of_birth} (${calculateAge(data.profile.date_of_birth)} yrs)` : null}
                  />
                  <InfoRow icon={<User className="h-4 w-4" />} label="Gender" value={data.profile.gender} capitalize />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={data.profile.phone} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Province" value={data.profile.province} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Domicile" value={data.profile.domicile} />
                </div>
              </section>

              {/* Education */}
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" /> Education ({data.educations.length})
                </h3>
                {data.educations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No education entries</p>
                ) : (
                  <div className="space-y-2">
                    {data.educations.map((edu: any) => (
                      <div key={edu.id} className="p-2.5 rounded-lg bg-muted/50 text-sm">
                        <span className="font-medium capitalize">{edu.education_level}</span>
                        {edu.education_field && (
                          <span className="text-muted-foreground"> — {edu.education_field.display_name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Applications */}
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" /> Applications ({data.applications.length})
                </h3>
                {data.applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No applications</p>
                ) : (
                  <div className="space-y-2">
                    {data.applications.map((app: any) => (
                      <div key={app.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{app.job?.title || "Unknown Job"}</p>
                            <p className="text-xs text-muted-foreground">{app.job?.department}</p>
                          </div>
                          <Badge className={`text-xs shrink-0 ${statusColors[app.status] || "bg-muted"}`}>
                            {app.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>Applied: {new Date(app.created_at).toLocaleDateString()}</span>
                          {app.payment_amount && <span>Rs. {Number(app.payment_amount).toLocaleString()}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Documents */}
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Documents ({data.documents.length})
                </h3>
                {data.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                ) : (
                  <div className="space-y-2">
                    {data.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{doc.document_type}</p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

const InfoRow = ({ icon, label, value, capitalize }: { icon: React.ReactNode; label: string; value: string | null | undefined; capitalize?: boolean }) => (
  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
    <span className="text-primary shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${capitalize ? "capitalize" : ""}`}>{value || "—"}</p>
    </div>
  </div>
);

export default ChatUserProfile;
