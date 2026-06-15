import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  FileText,
  Eye,
  Download,
  FileImage,
  File,
  Briefcase,
  Loader2,
  Image as ImageIcon,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

interface AppLike {
  id: string;
  user_id: string;
  status: string;
  payment_amount?: number | null;
  payment_date?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  created_at: string;
  job?: {
    id: string;
    title: string;
    department: string;
    total_fee: number;
    last_date: string;
  };
  category?: { display_name: string } | null;
  custom_description?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: AppLike | null;
  /** "application" or "work_request" */
  type?: "application" | "work_request";
  /** Optional callback to start a chat with this applicant. When provided, a "Start Chat" button is shown. */
  onStartChat?: (application: AppLike) => void;
  /** Loading state for the start-chat action. */
  startingChat?: boolean;
  /** Lifecycle status for the chat creation: idle (not started), starting (in flight), ready (created). */
  chatStatus?: "idle" | "starting" | "ready";
}

const getDocIcon = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes("image") || t.includes("photo") || t.includes("cnic") || t.includes("picture")) {
    return <FileImage className="h-4 w-4 text-info" />;
  }
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const isImageDoc = (doc: { document_type: string; file_name: string; file_url: string }) => {
  const t = doc.document_type.toLowerCase();
  const n = doc.file_name.toLowerCase();
  const u = doc.file_url.toLowerCase();
  return (
    t.includes("image") ||
    t.includes("photo") ||
    t.includes("cnic") ||
    t.includes("picture") ||
    /\.(png|jpe?g|gif|webp|bmp)$/i.test(n) ||
    /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(u)
  );
};

const ApplicationDetailsDialog = ({ open, onOpenChange, application, type = "application", onStartChat, startingChat, chatStatus = "idle" }: Props) => {
  const userId = application?.user_id;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-applicant-details", userId],
    queryFn: async () => {
      if (!userId) return null;
      const [profileRes, eduRes, docsRes, fieldsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_educations").select("*").eq("user_id", userId),
        supabase
          .from("user_documents")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("education_fields").select("id, display_name, education_level"),
      ]);

      const fieldMap = new Map(
        (fieldsRes.data || []).map((f) => [f.id, f.display_name as string]),
      );

      return {
        profile: profileRes.data,
        educations: (eduRes.data || []).map((e) => ({
          ...e,
          field_name: e.education_field_id ? fieldMap.get(e.education_field_id) : null,
        })),
        documents: docsRes.data || [],
      };
    },
    enabled: !!userId && open,
  });

  const profile = data?.profile;
  const educations = data?.educations || [];
  const documents = data?.documents || [];
  const images = documents.filter(isImageDoc);
  const otherDocs = documents.filter((d) => !isImageDoc(d));

  const calcAge = (dob?: string | null) => {
    if (!dob) return null;
    const d = new Date(dob);
    const diff = Date.now() - d.getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Applicant Details
            </span>
            {onStartChat && application && (
              <div className="flex items-center gap-2">
                {chatStatus !== "idle" && (
                  <Badge
                    variant={chatStatus === "ready" ? "default" : "secondary"}
                    className="gap-1 text-[10px] uppercase tracking-wide"
                  >
                    {chatStatus === "ready" ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Chat ready
                      </>
                    ) : (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" /> Chat in progress
                      </>
                    )}
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5"
                  onClick={() => onStartChat(application)}
                  disabled={startingChat || chatStatus === "starting"}
                >
                  {startingChat || chatStatus === "starting" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  {chatStatus === "ready" ? "Open Chat" : "Start Chat"}
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !application ? (
          <p className="text-muted-foreground text-sm">No application selected.</p>
        ) : (
          <div className="space-y-5">
            {/* Job / Service Info */}
            <section className="rounded-lg border border-border bg-muted/30 p-3">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                {type === "application" ? "Job Details" : "Service Request"}
              </h3>
              {type === "application" && application.job ? (
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Title:</span> <span className="font-medium">{application.job.title}</span></p>
                  <p><span className="text-muted-foreground">Department:</span> {application.job.department}</p>
                  <p><span className="text-muted-foreground">Last Date:</span> {new Date(application.job.last_date).toLocaleDateString()}</p>
                  <p><span className="text-muted-foreground">Total Fee:</span> Rs. {Number(application.job.total_fee).toLocaleString()}</p>
                </div>
              ) : (
                <div className="space-y-1 text-sm">
                  {application.category?.display_name && (
                    <p><span className="text-muted-foreground">Category:</span> <span className="font-medium">{application.category.display_name}</span></p>
                  )}
                  {application.custom_description && (
                    <p><span className="text-muted-foreground">Description:</span> {application.custom_description}</p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">Status: {application.status}</Badge>
                {application.payment_amount != null && (
                  <Badge variant="outline" className="text-xs">
                    Paid: Rs. {Number(application.payment_amount).toLocaleString()}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  Applied: {new Date(application.created_at).toLocaleDateString()}
                </Badge>
              </div>
              {application.notes && (
                <p className="text-xs text-muted-foreground mt-2 italic">Note: {application.notes}</p>
              )}
            </section>

            {/* Personal Info */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <User className="h-4 w-4" /> Personal Information
              </h3>
              {profile ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <InfoRow icon={<User className="h-4 w-4" />} label="Full Name" value={profile.full_name} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={profile.phone} />
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Date of Birth"
                    value={
                      profile.date_of_birth
                        ? `${new Date(profile.date_of_birth).toLocaleDateString()} (${calcAge(profile.date_of_birth)} yrs)`
                        : null
                    }
                  />
                  <InfoRow icon={<User className="h-4 w-4" />} label="Gender" value={profile.gender} capitalize />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Province" value={profile.province} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Domicile" value={profile.domicile} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Profile not found.</p>
              )}
            </section>

            {/* Education */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <GraduationCap className="h-4 w-4" /> Education ({educations.length})
              </h3>
              {educations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No education entries.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {educations.map((e) => (
                    <Badge key={e.id} variant="secondary" className="text-xs capitalize">
                      {e.education_level}
                      {e.field_name && <span className="ml-1 normal-case">— {e.field_name}</span>}
                    </Badge>
                  ))}
                </div>
              )}
            </section>

            {/* Image previews */}
            {images.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> Photos & Images ({images.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {images.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group relative rounded-lg overflow-hidden border border-border bg-muted aspect-square"
                      title={doc.file_name}
                    >
                      <img
                        src={doc.file_url}
                        alt={doc.file_name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                        <p className="text-[10px] text-white capitalize truncate">
                          {doc.document_type.replace(/_/g, " ")}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Other Documents */}
            {otherDocs.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Documents ({otherDocs.length})
                </h3>
                <div className="space-y-2">
                  {otherDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getDocIcon(doc.document_type)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {doc.document_type.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => window.open(doc.file_url, "_blank")} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => window.open(doc.file_url, "_blank")} title="Download">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {documents.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No documents uploaded by user.</p>
            )}

            {/* Receipt */}
            {application.receipt_url && (
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Payment Receipt
                </h3>
                <Button variant="outline" size="sm" onClick={() => window.open(application.receipt_url!, "_blank")} className="gap-2">
                  <Eye className="h-4 w-4" /> View Receipt
                </Button>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  capitalize?: boolean;
}) => (
  <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
    <span className="text-primary mt-0.5">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium text-foreground truncate ${capitalize ? "capitalize" : ""}`}>
        {value || <span className="text-muted-foreground italic font-normal">Not provided</span>}
      </p>
    </div>
  </div>
);

export default ApplicationDetailsDialog;
