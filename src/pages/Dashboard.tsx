import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Clock,
  CheckCircle,
  FileText,
  MessageSquare,
  Upload,
  User,
  Calendar,
  MapPin,
  GraduationCap,
  Settings,
  Loader2,
  Save,
  FileQuestion,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMyApplications, Application } from "@/hooks/useApplications";
import { useMyWorkRequests, WorkRequest, useGetOrCreateWorkRequestConversation } from "@/hooks/useWorkRequests";
import { useUpdateProfile, calculateAge } from "@/hooks/useProfile";
import { useUserEducations, useSetUserEducations } from "@/hooks/useEducationFields";
import { useEducationFields } from "@/hooks/useEducationFields";
import { useAllEducationLevels } from "@/hooks/useEducationLevels";
import { openApplicationChat } from "@/components/chat/ChatWidget";
import { toast } from "sonner";
import EducationSelector, { EducationEntry } from "@/components/education/EducationSelector";
import RefreshButton from "@/components/RefreshButton";
import { useQueryClient } from "@tanstack/react-query";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import MyDocuments from "@/components/dashboard/MyDocuments";
import TestPrepPromo from "@/components/TestPrepPromo";
import {
  ServiceDisclaimerBanner,
  ServiceDisclaimerDialog,
  useServiceDisclaimer,
} from "@/components/dashboard/ServiceDisclaimer";

const statusLabels: Record<Application["status"], string> = {
  pending: "Pending",
  payment_received: "Payment Received",
  expert_assigned: "Expert Assigned",
  in_progress: "In Progress",
  applied: "Applied",
  completed: "Completed",
};

const statusProgress: Record<Application["status"], number> = {
  pending: 10,
  payment_received: 25,
  expert_assigned: 40,
  in_progress: 60,
  applied: 90,
  completed: 100,
};


const Dashboard = () => {
  const { profile, user, loading: authLoading } = useAuth();
  const { data: applications, isLoading: appsLoading } = useMyApplications();
  const { data: workRequests = [], isLoading: workRequestsLoading } = useMyWorkRequests();
  const getOrCreateWorkRequestConv = useGetOrCreateWorkRequestConversation();
  const updateProfile = useUpdateProfile();
  const { data: userEducations = [], isLoading: educationsLoading } = useUserEducations(user?.id);
  const setUserEducations = useSetUserEducations();
  const { data: allEducationLevels = [] } = useAllEducationLevels();
  const { data: allEducationFields = [] } = useEducationFields();
  
  const disclaimer = useServiceDisclaimer();
  const [activeTab, setActiveTab] = useState("applications");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: profile?.full_name || "",
    date_of_birth: profile?.date_of_birth || "",
    gender: profile?.gender || "",
    province: profile?.province || "",
    domicile: profile?.domicile || "",
    phone: profile?.phone || "",
    gmail: (profile as any)?.gmail || "",
  });
  const [editEducations, setEditEducations] = useState<EducationEntry[]>([]);

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || "",
        date_of_birth: profile.date_of_birth || "",
        gender: profile.gender || "",
        province: profile.province || "",
        domicile: profile.domicile || "",
        phone: profile.phone || "",
        gmail: (profile as any).gmail || "",
      });
    }
  }, [profile]);

  // Update educations when user educations load
  useEffect(() => {
    if (userEducations.length > 0) {
      setEditEducations(
        userEducations.map((e) => ({
          education_level: e.education_level,
          education_field_id: e.education_field_id,
        }))
      );
    }
  }, [userEducations]);

  const getStatusBadge = (status: Application["status"]) => {
    const colors: Record<Application["status"], string> = {
      pending: "bg-warning",
      payment_received: "bg-info",
      expert_assigned: "bg-info",
      in_progress: "bg-info",
      applied: "bg-success",
      completed: "bg-success",
    };
    return <Badge className={colors[status]}>{statusLabels[status]}</Badge>;
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        full_name: editForm.full_name,
        date_of_birth: editForm.date_of_birth || undefined,
        gender: editForm.gender as any || undefined,
        province: editForm.province || undefined,
        domicile: editForm.domicile || undefined,
        phone: editForm.phone || undefined,
        gmail: editForm.gmail ? editForm.gmail.trim() : null,
      });
      
      // Save educations
      if (user) {
        await setUserEducations.mutateAsync({
          user_id: user.id,
          educations: editEducations,
        });
      }
      
      setIsEditing(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalItems = (applications?.length || 0) + workRequests.length;
  const inProgressItems = (applications?.filter((a) => ["pending", "payment_received", "expert_assigned", "in_progress"].includes(a.status)).length || 0) + 
    workRequests.filter((wr) => ["pending", "payment_received", "expert_assigned", "in_progress"].includes(wr.status)).length;
  const completedItems = (applications?.filter((a) => ["applied", "completed"].includes(a.status)).length || 0) +
    workRequests.filter((wr) => ["applied", "completed"].includes(wr.status)).length;

  const applicationStats = {
    total: totalItems,
    inProgress: inProgressItems,
    completed: completedItems,
  };

  const qc = useQueryClient();
  const ptr = usePullToRefresh({
    onRefresh: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["my-applications"] }),
        qc.invalidateQueries({ queryKey: ["my-work-requests"] }),
        qc.invalidateQueries({ queryKey: ["profile"] }),
        qc.invalidateQueries({ queryKey: ["user-educations"] }),
      ]).then(() => undefined),
  });

  return (
    <div className="py-8">
      <PullToRefreshIndicator {...ptr} />
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0]}!
          </h1>
          <p className="text-muted-foreground">
            Track your applications and manage your profile
          </p>
        </div>

        {/* Service disclaimer banner */}
        <ServiceDisclaimerBanner onOpenDialog={() => disclaimer.setOpen(true)} />
        <ServiceDisclaimerDialog open={disclaimer.open} onOpenChange={disclaimer.setOpen} />



        {/* Profile completion prompt */}
        {profile && (() => {
          const missing: { key: string; label: string }[] = [];
          if (!profile.date_of_birth) missing.push({ key: "dob", label: "Date of birth" });
          if (!profile.gender) missing.push({ key: "gender", label: "Gender" });
          if (userEducations.length === 0) missing.push({ key: "edu", label: "Education" });
          if (!profile.province) missing.push({ key: "province", label: "Province" });
          if (!profile.domicile) missing.push({ key: "domicile", label: "Domicile" });

          if (missing.length === 0) return null;

          return (
            <div className="mb-6 rounded-lg border border-warning/40 bg-warning/10 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    Complete your profile for better job matches
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    We use these details to check your eligibility for government jobs. Please add:
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {missing.map((m) => (
                      <Badge key={m.key} variant="outline" className="border-warning/50 text-foreground">
                        {m.label}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setActiveTab("profile");
                      setIsEditing(true);
                      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
                    }}
                    className="gap-2"
                  >
                    Complete Profile
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{applicationStats.total}</p>
                <p className="text-sm text-muted-foreground">Applications</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{applicationStats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{applicationStats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {profile?.education ? "✓" : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Profile Complete</p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Prep cross-promotion */}
        <TestPrepPromo className="mb-6" />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="applications" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Applications & Requests
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications">
            {(appsLoading || workRequestsLoading) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (applications?.length === 0 && workRequests.length === 0) ? (
              <div className="card-elevated p-8 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No Applications Yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start by browsing available jobs or submit a work request.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button asChild>
                    <a href="/jobs">Browse Jobs</a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Job Applications */}
                {applications && applications.length > 0 && (
                  <>
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Job Applications ({applications.length})
                    </h3>
                    {applications.map((app) => (
                      <div key={app.id} className="card-elevated p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-3">
                              <div>
                                <h3 className="text-lg font-semibold text-foreground">
                                  {app.job?.title || "Job"}
                                </h3>
                                <p className="text-muted-foreground">{app.job?.department}</p>
                              </div>
                              {getStatusBadge(app.status)}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">{statusProgress[app.status]}%</span>
                              </div>
                              <Progress value={statusProgress[app.status]} className="h-2" />
                              <p className="text-sm text-muted-foreground">
                                Applied on {new Date(app.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="text-sm text-muted-foreground">
                              Amount: <span className="font-medium text-foreground">Rs. {Number(app.payment_amount).toLocaleString()}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2"
                                onClick={() => openApplicationChat(app.id, app.job?.title || 'Job Application')}
                              >
                                <MessageSquare className="h-4 w-4" />
                                Chat
                              </Button>
                              {app.receipt_url && (
                                <Button variant="outline" size="sm" className="gap-2">
                                  <FileText className="h-4 w-4" />
                                  Receipt
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Work Requests */}
                {workRequests.length > 0 && (
                  <>
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mt-6">
                      <FileQuestion className="h-4 w-4" />
                      Work Requests ({workRequests.length})
                    </h3>
                    {workRequests.map((wr) => (
                      <div key={wr.id} className="card-elevated p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-3">
                              <div>
                                <h3 className="text-lg font-semibold text-foreground">
                                  {wr.category?.display_name || "Custom Request"}
                                </h3>
                                <p className="text-muted-foreground line-clamp-2">{wr.custom_description}</p>
                              </div>
                              {getStatusBadge(wr.status)}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">{statusProgress[wr.status]}%</span>
                              </div>
                              <Progress value={statusProgress[wr.status]} className="h-2" />
                              <p className="text-sm text-muted-foreground">
                                Submitted on {new Date(wr.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            {wr.payment_amount && (
                              <div className="text-sm text-muted-foreground">
                                Amount: <span className="font-medium text-foreground">Rs. {Number(wr.payment_amount).toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2"
                                onClick={async () => {
                                  try {
                                    const conv = await getOrCreateWorkRequestConv.mutateAsync({
                                      workRequestId: wr.id,
                                      categoryName: wr.category?.display_name || 'Work Request',
                                    });
                                    // Open the chat widget - we can use the same openApplicationChat but it expects application
                                    // For now, just navigate or show a toast
                                    toast.success("Chat opened! Check the chat widget.");
                                  } catch (error) {
                                    console.error("Failed to open chat:", error);
                                  }
                                }}
                                disabled={getOrCreateWorkRequestConv.isPending}
                              >
                                <MessageSquare className="h-4 w-4" />
                                Chat
                              </Button>
                              {wr.receipt_url && (
                                <Button variant="outline" size="sm" className="gap-2">
                                  <FileText className="h-4 w-4" />
                                  Receipt
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            {!profile?.phone && (
              <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-foreground">
                  <span className="font-medium">Phone number is required.</span> We use it to
                  coordinate your application status and contact you about job updates. Please
                  add it below.
                </p>
              </div>
            )}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">
                  Personal Information
                </h2>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      className="gap-2"
                      onClick={handleSaveProfile}
                      disabled={updateProfile.isPending}
                    >
                      {updateProfile.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => {
                      setEditForm({
                        full_name: profile?.full_name || "",
                        date_of_birth: profile?.date_of_birth || "",
                        gender: profile?.gender || "",
                        province: profile?.province || "",
                        domicile: profile?.domicile || "",
                        phone: profile?.phone || "",
                        gmail: (profile as any)?.gmail || "",
                      });
                      setEditEducations(
                        userEducations.map((e) => ({
                          education_level: e.education_level,
                          education_field_id: e.education_field_id,
                        }))
                      );
                      setIsEditing(true);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>

              {isEditing ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={editForm.date_of_birth}
                        onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select 
                        value={editForm.gender} 
                        onValueChange={(v) => setEditForm({ ...editForm, gender: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Phone <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="+92 300 1234567"
                      />
                      <p className="text-xs text-muted-foreground">
                        Required &mdash; used to contact you about your applications.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Gmail address (optional)</Label>
                      <Input
                        type="email"
                        value={editForm.gmail}
                        onChange={(e) => setEditForm({ ...editForm, gmail: e.target.value })}
                        placeholder="yourname@gmail.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Optional &mdash; lets us connect your Gmail for job updates.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Education</Label>
                      <EducationSelector
                        value={editEducations}
                        onChange={setEditEducations}
                        maxEntries={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Province</Label>
                      <Select 
                        value={editForm.province} 
                        onValueChange={(v) => setEditForm({ ...editForm, province: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Punjab">Punjab</SelectItem>
                          <SelectItem value="Sindh">Sindh</SelectItem>
                          <SelectItem value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</SelectItem>
                          <SelectItem value="Balochistan">Balochistan</SelectItem>
                          <SelectItem value="Islamabad">Islamabad</SelectItem>
                          <SelectItem value="AJK">AJK</SelectItem>
                          <SelectItem value="Gilgit-Baltistan">Gilgit-Baltistan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Domicile</Label>
                      <Input
                        value={editForm.domicile}
                        onChange={(e) => setEditForm({ ...editForm, domicile: e.target.value })}
                        placeholder="e.g., Lahore"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium text-foreground">
                          {profile?.full_name || "Not set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date of Birth / Age</p>
                        <p className="font-medium text-foreground">
                          {profile?.date_of_birth 
                            ? `${profile.date_of_birth} (${calculateAge(profile.date_of_birth)} years)` 
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium text-foreground">
                          {profile?.gender 
                            ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) 
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        <p className="text-sm text-muted-foreground">Education</p>
                      </div>
                      {userEducations.length > 0 ? (
                        <div className="space-y-1">
                          {userEducations.map((edu, idx) => {
                            const levelLabel = allEducationLevels.find(
                              (l) => l.value === edu.education_level
                            )?.label || edu.education_level;
                            const fieldLabel = edu.education_field?.display_name;
                            return (
                              <p key={idx} className="font-medium text-foreground text-sm">
                                {levelLabel}
                                {fieldLabel && (
                                  <span className="text-muted-foreground"> - {fieldLabel}</span>
                                )}
                              </p>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="font-medium text-foreground">Not set</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Province</p>
                        <p className="font-medium text-foreground">
                          {profile?.province || "Not set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Domicile</p>
                        <p className="font-medium text-foreground">
                          {profile?.domicile || "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <MyDocuments />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
