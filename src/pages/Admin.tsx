import { useState, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Briefcase,
  Users,
  FileText,
  Trash2,
  Edit,
  Eye,
  Calculator,
  Loader2,
  XCircle,
  CheckCircle,
  MessageCircle,
  GraduationCap,
  Tag,
  Settings,
  FileUp,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAllJobs, useCreateJob, useDeleteJob, useToggleJobStatus, CreateJobInput } from "@/hooks/useJobs";
import { useAllApplications, useUpdateApplicationStatus } from "@/hooks/useApplications";
import { useAllWorkRequests, useUpdateWorkRequestStatus } from "@/hooks/useWorkRequests";
import { useAuth } from "@/hooks/useAuth";
import { useAllEducationLevels } from "@/hooks/useEducationLevels";
import { useEducationFields } from "@/hooks/useEducationFields";
import { MultiSelect } from "@/components/ui/multi-select";
import AdminChatPanel from "@/components/chat/AdminChatPanel";
import { useAdminStartConversation } from "@/hooks/useChat";
import { toast } from "@/hooks/use-toast";
import { useBulkCreateJobs } from "@/hooks/useBulkJobImport";
import EducationFieldsManager from "@/components/admin/EducationFieldsManager";
import ServiceCategoriesManager from "@/components/admin/ServiceCategoriesManager";
import SeoSettingsManager from "@/components/admin/SeoSettingsManager";
import UserManagement from "@/components/admin/UserManagement";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
const ExpertPerformance = lazy(() => import("@/components/admin/ExpertPerformance"));
const WhatsAppBulkMessaging = lazy(() => import("@/components/admin/WhatsAppBulkMessaging"));
import { useExpertUsers } from "@/hooks/useExperts";
import { BarChart3, UserCheck, MessageSquare as MessageSquareIcon } from "lucide-react";
const PROVINCE_OPTIONS = [
  { value: "Punjab", label: "Punjab" },
  { value: "Sindh", label: "Sindh" },
  { value: "Khyber Pakhtunkhwa", label: "Khyber Pakhtunkhwa" },
  { value: "Balochistan", label: "Balochistan" },
  { value: "Islamabad", label: "Islamabad" },
  { value: "AJK", label: "AJK" },
  { value: "Gilgit-Baltistan", label: "Gilgit-Baltistan" },
];

const ADMIN_JOBS_PER_PAGE = 15;

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: jobs, isLoading: jobsLoading } = useAllJobs();
  const { data: applications, isLoading: appsLoading } = useAllApplications();
  const { data: workRequests = [], isLoading: workRequestsLoading } = useAllWorkRequests();
  const createJob = useCreateJob();
  const deleteJob = useDeleteJob();
  const toggleJobStatus = useToggleJobStatus();
  const updateApplicationStatus = useUpdateApplicationStatus();
  const updateWorkRequestStatus = useUpdateWorkRequestStatus();
  const { data: educationLevels = [] } = useAllEducationLevels();
  const { data: educationFields = [] } = useEducationFields();
  const adminStartConversation = useAdminStartConversation();
  const { data: expertUsers = [] } = useExpertUsers();

  const [activeTab, setActiveTab] = useState("jobs");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showAddJob, setShowAddJob] = useState(false);
  const [showEducationManager, setShowEducationManager] = useState(false);
  const [showServiceCategoriesManager, setShowServiceCategoriesManager] = useState(false);
  const [selectedEducationFields, setSelectedEducationFields] = useState<string[]>([]);

  // Bulk delete state
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Pagination state for admin jobs
  const [jobsPage, setJobsPage] = useState(1);

  const [formData, setFormData] = useState({
    title: "",
    department: "",
    description: "",
    required_education_levels: [] as string[],
    required_education_fields: [] as string[],
    min_age: "18",
    max_age: "35",
    gender_requirement: "",
    provinces: [] as string[],
    domicile: "",
    total_seats: "1",
    last_date: "",
    bank_challan_fee: "",
    post_office_fee: "",
    photocopy_fee: "",
    expert_fee: "",
    advertisement_link: "",
    advertisement_image: "",
  });

  // Get education fields for selected levels
  const availableFieldsForSelectedLevels = educationFields.filter(
    (f) => formData.required_education_levels.includes(f.education_level)
  );

  const educationFieldOptions = availableFieldsForSelectedLevels.map((f) => ({
    value: f.id,
    label: `${f.display_name} (${educationLevels.find(l => l.value === f.education_level)?.label || f.education_level})`,
  }));

  const totalFees =
    (parseInt(formData.bank_challan_fee) || 0) +
    (parseInt(formData.post_office_fee) || 0) +
    (parseInt(formData.photocopy_fee) || 0) +
    (parseInt(formData.expert_fee) || 0);

  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.department || formData.required_education_levels.length === 0 || !formData.last_date) return;

    const jobData: CreateJobInput = {
      title: formData.title,
      department: formData.department,
      description: formData.description || undefined,
      required_education_levels: formData.required_education_levels,
      required_education_fields: formData.required_education_fields.length > 0 ? formData.required_education_fields : undefined,
      min_age: parseInt(formData.min_age) || 18,
      max_age: parseInt(formData.max_age) || 35,
      gender_requirement: formData.gender_requirement && formData.gender_requirement !== "any" ? formData.gender_requirement as any : null,
      provinces: formData.provinces.length > 0 ? formData.provinces : undefined,
      domicile: formData.domicile || undefined,
      total_seats: parseInt(formData.total_seats) || 1,
      last_date: formData.last_date,
      bank_challan_fee: parseInt(formData.bank_challan_fee) || 0,
      post_office_fee: parseInt(formData.post_office_fee) || 0,
      photocopy_fee: parseInt(formData.photocopy_fee) || 0,
      expert_fee: parseInt(formData.expert_fee) || 0,
      advertisement_link: formData.advertisement_link || undefined,
      advertisement_image: formData.advertisement_image || undefined,
    };

    try {
      await createJob.mutateAsync(jobData);
      setShowAddJob(false);
      setFormData({
        title: "", department: "", description: "",
        required_education_levels: [], required_education_fields: [],
        min_age: "18", max_age: "35", gender_requirement: "",
        provinces: [], domicile: "", total_seats: "1", last_date: "",
        bank_challan_fee: "", post_office_fee: "", photocopy_fee: "", expert_fee: "",
        advertisement_link: "", advertisement_image: "",
      });
    } catch (error) {}
  };

  const handleDeleteJob = async (id: string) => {
    if (confirm("Are you sure you want to delete this job?")) {
      await deleteJob.mutateAsync(id);
      setSelectedJobIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedJobIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedJobIds.size} job(s)?`)) return;
    setIsBulkDeleting(true);
    try {
      for (const id of selectedJobIds) {
        await deleteJob.mutateAsync(id);
      }
      setSelectedJobIds(new Set());
      toast({ title: "Bulk delete complete", description: `${selectedJobIds.size} jobs deleted.` });
    } catch (error) {
      toast({ title: "Error", description: "Some jobs could not be deleted.", variant: "destructive" });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await toggleJobStatus.mutateAsync({ id, is_active: !currentStatus });
  };

  const toggleSelectJob = (id: string) => {
    setSelectedJobIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (!paginatedJobs) return;
    if (selectedJobIds.size === paginatedJobs.length) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(paginatedJobs.map(j => j.id)));
    }
  };

  // Paginated admin jobs
  const totalJobPages = Math.ceil((jobs?.length || 0) / ADMIN_JOBS_PER_PAGE);
  const paginatedJobs = useMemo(() => {
    return jobs?.slice((jobsPage - 1) * ADMIN_JOBS_PER_PAGE, jobsPage * ADMIN_JOBS_PER_PAGE);
  }, [jobs, jobsPage]);

  const isJobExpired = (lastDate: string) => new Date(lastDate) < new Date(new Date().setHours(0, 0, 0, 0));

  // Stats
  const activeJobs = jobs?.filter((j) => j.is_active).length || 0;
  const totalApplications = applications?.length || 0;
  const totalRevenue = applications?.reduce((sum, app) => sum + (Number(app.payment_amount) || 0), 0) || 0;

  return (
    <div className="py-4 sm:py-8">
      <div className="container px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage jobs, users, and applications</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={showServiceCategoriesManager} onOpenChange={setShowServiceCategoriesManager}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Tag className="h-4 w-4" />
                  <span className="hidden sm:inline">Manage</span> Services
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Manage Service Categories</DialogTitle></DialogHeader>
                <ServiceCategoriesManager />
              </DialogContent>
            </Dialog>
            <Dialog open={showEducationManager} onOpenChange={setShowEducationManager}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">Manage</span> Education
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Manage Education Levels & Fields</DialogTitle></DialogHeader>
                <EducationFieldsManager />
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/admin/bulk-import")}>
              <FileUp className="h-4 w-4" />
              <span className="hidden sm:inline">Add Multiple</span> Jobs
            </Button>
            <Button size="sm" onClick={() => setShowAddJob(!showAddJob)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Job
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{activeJobs}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Active Jobs</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-info" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{jobs?.length || 0}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Jobs</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{totalApplications}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Applications</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">Rs. {(totalRevenue / 1000).toFixed(0)}K</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Revenue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Job Form */}
        {showAddJob && (
          <div className="card-elevated p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-6">Add New Government Job</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-medium text-foreground">Job Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title *</Label>
                    <Input id="title" placeholder="e.g., Assistant Sub Inspector" value={formData.title} onChange={(e) => handleChange("title", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Input id="department" placeholder="e.g., Punjab Police" value={formData.department} onChange={(e) => handleChange("department", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Job description..." rows={3} value={formData.description} onChange={(e) => handleChange("description", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="seats">Total Seats *</Label>
                      <Input id="seats" type="number" placeholder="500" value={formData.total_seats} onChange={(e) => handleChange("total_seats", e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastDate">Last Date *</Label>
                      <Input id="lastDate" type="date" value={formData.last_date} onChange={(e) => handleChange("last_date", e.target.value)} required />
                    </div>
                  </div>
                </div>

                {/* Eligibility */}
                <div className="space-y-4">
                  <h3 className="font-medium text-foreground">Eligibility Criteria</h3>
                  <div className="space-y-2">
                    <Label>Required Education Levels *</Label>
                    <MultiSelect options={educationLevels} selected={formData.required_education_levels} onChange={(selected) => { handleChange("required_education_levels", selected); const validFields = formData.required_education_fields.filter((fieldId) => { const field = educationFields.find((f) => f.id === fieldId); return field && selected.includes(field.education_level); }); handleChange("required_education_fields", validFields); }} placeholder="Select education levels..." />
                  </div>
                  {availableFieldsForSelectedLevels.length > 0 && (
                    <div className="space-y-2">
                      <Label>Required Education Fields (Optional)</Label>
                      <MultiSelect options={educationFieldOptions} selected={formData.required_education_fields} onChange={(selected) => handleChange("required_education_fields", selected)} placeholder="Any field within selected levels..." />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Minimum Age</Label>
                      <Input type="number" placeholder="18" value={formData.min_age} onChange={(e) => handleChange("min_age", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Maximum Age</Label>
                      <Input type="number" placeholder="35" value={formData.max_age} onChange={(e) => handleChange("max_age", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender Requirement</Label>
                    <Select value={formData.gender_requirement} onValueChange={(v) => handleChange("gender_requirement", v)}>
                      <SelectTrigger><SelectValue placeholder="Both Male & Female" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Both Male & Female</SelectItem>
                        <SelectItem value="male">Male Only</SelectItem>
                        <SelectItem value="female">Female Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Provinces</Label>
                    <MultiSelect options={PROVINCE_OPTIONS} selected={formData.provinces} onChange={(selected) => handleChange("provinces", selected)} placeholder="All Pakistan (leave empty)" />
                  </div>
                  <div className="space-y-2">
                    <Label>Domicile</Label>
                    <Input placeholder="e.g., Lahore" value={formData.domicile} onChange={(e) => handleChange("domicile", e.target.value)} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Fees */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Fee Breakdown (in PKR)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Challan Fee</Label>
                    <Input type="number" placeholder="500" value={formData.bank_challan_fee} onChange={(e) => handleChange("bank_challan_fee", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Post Office Fee</Label>
                    <Input type="number" placeholder="300" value={formData.post_office_fee} onChange={(e) => handleChange("post_office_fee", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Photocopy Charges</Label>
                    <Input type="number" placeholder="200" value={formData.photocopy_fee} onChange={(e) => handleChange("photocopy_fee", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expert Service Fee</Label>
                    <Input type="number" placeholder="1500" value={formData.expert_fee} onChange={(e) => handleChange("expert_fee", e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10">
                  <Calculator className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">Total:</span>
                  <span className="text-xl font-bold text-primary">Rs. {totalFees.toLocaleString()}</span>
                </div>
              </div>

              <Separator />

              {/* Advertisement */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Advertisement Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Advertisement Link</Label>
                    <Input placeholder="https://example.com/job-ad" value={formData.advertisement_link} onChange={(e) => handleChange("advertisement_link", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Advertisement Image URL</Label>
                    <Input placeholder="https://example.com/ad-image.jpg" value={formData.advertisement_image} onChange={(e) => handleChange("advertisement_image", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={createJob.isPending}>
                  {createJob.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Job
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddJob(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 sm:mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="jobs" className="gap-1.5 text-xs sm:text-sm">
              <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Jobs
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Applications</span><span className="sm:hidden">Apps</span>
            </TabsTrigger>
            <TabsTrigger value="work-requests" className="gap-1.5 text-xs sm:text-sm">
              <FileQuestion className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Work Requests</span><span className="sm:hidden">Requests</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
              <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Chat
            </TabsTrigger>
            <TabsTrigger value="seo" className="gap-1.5 text-xs sm:text-sm">
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> SEO
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Analytics</span><span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="experts" className="gap-1.5 text-xs sm:text-sm">
              <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Experts
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquareIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> WhatsApp
            </TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs">
            {jobsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : jobs?.length === 0 ? (
              <div className="card-elevated p-8 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Jobs Yet</h3>
                <p className="text-muted-foreground">Add your first job posting above.</p>
              </div>
            ) : (
              <>
                {/* Bulk delete bar */}
                {selectedJobIds.size > 0 && (
                  <div className="flex items-center justify-between p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-medium text-foreground">{selectedJobIds.size} job(s) selected</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedJobIds(new Set())}>Clear</Button>
                      <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isBulkDeleting} className="gap-1.5">
                        {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete Selected
                      </Button>
                    </div>
                  </div>
                )}

                {/* Mobile: Card view, Desktop: Table view */}
                {/* Desktop table */}
                <div className="card-elevated overflow-hidden hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-4 w-10">
                            <Checkbox
                              checked={paginatedJobs && paginatedJobs.length > 0 && selectedJobIds.size === paginatedJobs.length}
                              onCheckedChange={toggleSelectAll}
                            />
                          </th>
                          <th className="text-left p-4 font-medium text-foreground">Job Title</th>
                          <th className="text-left p-4 font-medium text-foreground">Department</th>
                          <th className="text-left p-4 font-medium text-foreground">Seats</th>
                          <th className="text-left p-4 font-medium text-foreground">Last Date</th>
                          <th className="text-left p-4 font-medium text-foreground">Fee</th>
                          <th className="text-left p-4 font-medium text-foreground">Status</th>
                          <th className="text-right p-4 font-medium text-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedJobs?.map((job) => {
                          const expired = isJobExpired(job.last_date);
                          return (
                            <tr key={job.id} className={`border-t border-border ${expired ? "opacity-60" : ""}`}>
                              <td className="p-4">
                                <Checkbox
                                  checked={selectedJobIds.has(job.id)}
                                  onCheckedChange={() => toggleSelectJob(job.id)}
                                />
                              </td>
                              <td className="p-4 font-medium text-foreground">{job.title}</td>
                              <td className="p-4 text-muted-foreground">{job.department}</td>
                              <td className="p-4 text-muted-foreground">{job.total_seats}</td>
                              <td className="p-4">
                                <span className={expired ? "text-destructive" : "text-muted-foreground"}>
                                  {new Date(job.last_date).toLocaleDateString()}
                                  {expired && " ⚠"}
                                </span>
                              </td>
                              <td className="p-4 text-muted-foreground">Rs. {Number(job.total_fee).toLocaleString()}</td>
                              <td className="p-4">
                                <Badge className={job.is_active ? "bg-success" : "bg-muted"}>{job.is_active ? "Active" : "Inactive"}</Badge>
                              </td>
                              <td className="p-4">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(job.id, job.is_active)}>
                                    {job.is_active ? <XCircle className="h-4 w-4 text-warning" /> : <CheckCircle className="h-4 w-4 text-success" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteJob(job.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {paginatedJobs?.map((job) => {
                    const expired = isJobExpired(job.last_date);
                    return (
                      <div key={job.id} className={`card-elevated p-4 ${expired ? "opacity-60" : ""}`}>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedJobIds.has(job.id)}
                            onCheckedChange={() => toggleSelectJob(job.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-medium text-foreground text-sm truncate">{job.title}</h3>
                                <p className="text-xs text-muted-foreground">{job.department}</p>
                              </div>
                              <Badge className={`text-xs shrink-0 ${job.is_active ? "bg-success" : "bg-muted"}`}>
                                {job.is_active ? "Active" : "Off"}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                              <span>{job.total_seats} seats</span>
                              <span className={expired ? "text-destructive" : ""}>{new Date(job.last_date).toLocaleDateString()}{expired && " ⚠"}</span>
                              <span>Rs. {Number(job.total_fee).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-end gap-1 mt-2">
                              <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(job.id, job.is_active)}>
                                {job.is_active ? <XCircle className="h-4 w-4 text-warning" /> : <CheckCircle className="h-4 w-4 text-success" />}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteJob(job.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalJobPages > 1 && (
                  <div className="flex items-center justify-center gap-1 sm:gap-2 mt-6 flex-wrap">
                    <Button variant="outline" size="sm" disabled={jobsPage === 1} onClick={() => setJobsPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {jobsPage} of {totalJobPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={jobsPage === totalJobPages} onClick={() => setJobsPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="card-elevated p-4 sm:p-6">
              <UserManagement />
            </div>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            {appsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : applications?.length === 0 ? (
              <div className="card-elevated p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Applications Yet</h3>
                <p className="text-muted-foreground">Applications will appear here once users start applying.</p>
              </div>
            ) : (
              <div className="card-elevated overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium text-foreground">User</th>
                        <th className="text-left p-4 font-medium text-foreground">Job</th>
                        <th className="text-left p-4 font-medium text-foreground hidden sm:table-cell">Applied</th>
                        <th className="text-left p-4 font-medium text-foreground hidden sm:table-cell">Amount</th>
                        <th className="text-left p-4 font-medium text-foreground">Expert</th>
                        <th className="text-left p-4 font-medium text-foreground">Status</th>
                        <th className="text-right p-4 font-medium text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications?.map((app) => (
                        <tr key={app.id} className="border-t border-border">
                          <td className="p-4">
                            <p className="font-medium text-foreground text-sm">{app.profile?.full_name || 'Unknown'}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-foreground text-sm">{app.job?.title}</p>
                            <p className="text-xs text-muted-foreground">{app.job?.department}</p>
                          </td>
                          <td className="p-4 text-muted-foreground text-sm hidden sm:table-cell">
                            {new Date(app.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-muted-foreground text-sm hidden sm:table-cell">
                            Rs. {Number(app.payment_amount).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <Select
                              value={app.expert_id || "unassigned"}
                              onValueChange={(value) => {
                                const expertId = value === "unassigned" ? undefined : value;
                                updateApplicationStatus.mutate({
                                  id: app.id,
                                  status: expertId ? "expert_assigned" : app.status,
                                  expert_id: expertId,
                                });
                              }}
                            >
                              <SelectTrigger className="w-[130px] sm:w-[160px] text-xs sm:text-sm">
                                <SelectValue placeholder="Assign Expert" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {expertUsers.map((expert) => (
                                  <SelectItem key={expert.user_id} value={expert.user_id}>
                                    {expert.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4">
                            <Select value={app.status} onValueChange={(value) => updateApplicationStatus.mutate({ id: app.id, status: value as any })}>
                              <SelectTrigger className="w-[140px] sm:w-[180px] text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="payment_received">Payment Received</SelectItem>
                                <SelectItem value="expert_assigned">Expert Assigned</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={async () => {
                                try {
                                  const conv = await adminStartConversation.mutateAsync({ userId: app.user_id, applicationId: app.id, jobTitle: app.job?.title || 'Job Application' });
                                  setSelectedConversationId(conv.id);
                                  setActiveTab("chat");
                                  toast({ title: "Conversation started", description: `Chat opened with ${app.profile?.full_name || 'user'}` });
                                } catch (error) { console.error('Failed to start conversation:', error); }
                              }} title="Start Chat">
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/jobs/${app.job_id}`)} title="View Job">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Work Requests Tab */}
          <TabsContent value="work-requests">
            {workRequestsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : workRequests.length === 0 ? (
              <div className="card-elevated p-8 text-center">
                <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Work Requests Yet</h3>
                <p className="text-muted-foreground">Work requests will appear here once users submit them.</p>
              </div>
            ) : (
              <div className="card-elevated overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium text-foreground">User</th>
                        <th className="text-left p-4 font-medium text-foreground hidden sm:table-cell">Category</th>
                        <th className="text-left p-4 font-medium text-foreground">Description</th>
                        <th className="text-left p-4 font-medium text-foreground hidden sm:table-cell">Submitted</th>
                        <th className="text-left p-4 font-medium text-foreground hidden sm:table-cell">Amount</th>
                        <th className="text-left p-4 font-medium text-foreground">Expert</th>
                        <th className="text-left p-4 font-medium text-foreground">Status</th>
                        <th className="text-right p-4 font-medium text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workRequests.map((wr) => (
                        <tr key={wr.id} className="border-t border-border">
                          <td className="p-4"><p className="font-medium text-foreground text-sm">{wr.profile?.full_name || 'Unknown'}</p></td>
                          <td className="p-4 hidden sm:table-cell"><Badge variant="secondary">{wr.category?.display_name || 'Custom'}</Badge></td>
                          <td className="p-4 max-w-xs"><p className="text-sm text-muted-foreground line-clamp-2">{wr.custom_description}</p></td>
                          <td className="p-4 text-muted-foreground text-sm hidden sm:table-cell">{new Date(wr.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-muted-foreground text-sm hidden sm:table-cell">{wr.payment_amount ? `Rs. ${Number(wr.payment_amount).toLocaleString()}` : '—'}</td>
                          <td className="p-4">
                            <Select
                              value={wr.expert_id || "unassigned"}
                              onValueChange={(value) => {
                                const expertId = value === "unassigned" ? undefined : value;
                                updateWorkRequestStatus.mutate({
                                  id: wr.id,
                                  status: expertId ? "expert_assigned" : wr.status,
                                  expert_id: expertId,
                                });
                              }}
                            >
                              <SelectTrigger className="w-[130px] sm:w-[160px] text-xs sm:text-sm">
                                <SelectValue placeholder="Assign Expert" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {expertUsers.map((expert) => (
                                  <SelectItem key={expert.user_id} value={expert.user_id}>
                                    {expert.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4">
                            <Select value={wr.status} onValueChange={(value) => updateWorkRequestStatus.mutate({ id: wr.id, status: value as any })}>
                              <SelectTrigger className="w-[140px] sm:w-[180px] text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="payment_received">Payment Received</SelectItem>
                                <SelectItem value="expert_assigned">Expert Assigned</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" title="Start Chat" onClick={async () => {
                                try {
                                  const conv = await adminStartConversation.mutateAsync({ userId: wr.user_id, workRequestId: wr.id, jobTitle: wr.custom_description?.slice(0, 50) || 'Work Request' });
                                  setSelectedConversationId(conv.id);
                                  setActiveTab("chat");
                                  toast({ title: "Conversation started", description: `Chat opened with ${wr.profile?.full_name || 'user'}` });
                                } catch (error) { console.error('Failed to start conversation:', error); }
                              }}>
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="View Details" onClick={() => {
                                toast({ title: wr.profile?.full_name || 'Work Request', description: wr.custom_description });
                              }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <AdminChatPanel initialConversationId={selectedConversationId} onConversationSelected={() => setSelectedConversationId(null)} />
          </TabsContent>

          {/* SEO Settings Tab */}
          <TabsContent value="seo">
            <div className="card-elevated p-4 sm:p-6">
              <SeoSettingsManager />
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Experts Tab */}
          <TabsContent value="experts">
            <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ExpertPerformance />
            </Suspense>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp">
            <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <WhatsAppBulkMessaging />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
