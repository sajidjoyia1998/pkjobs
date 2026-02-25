import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  FileQuestion,
  Settings,
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
import { useBulkCreateJobs, parseJobsFromText, BULK_JOB_SAMPLE, ValidationOptions } from "@/hooks/useBulkJobImport";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, FileUp } from "lucide-react";
import EducationFieldsManager from "@/components/admin/EducationFieldsManager";
import BulkImportValidationErrors from "@/components/admin/BulkImportValidationErrors";
import ServiceCategoriesManager from "@/components/admin/ServiceCategoriesManager";
import SeoSettingsManager from "@/components/admin/SeoSettingsManager";

const PROVINCE_OPTIONS = [
  { value: "Punjab", label: "Punjab" },
  { value: "Sindh", label: "Sindh" },
  { value: "Khyber Pakhtunkhwa", label: "Khyber Pakhtunkhwa" },
  { value: "Balochistan", label: "Balochistan" },
  { value: "Islamabad", label: "Islamabad" },
  { value: "AJK", label: "AJK" },
  { value: "Gilgit-Baltistan", label: "Gilgit-Baltistan" },
];

const Admin = () => {
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
  const bulkCreateJobs = useBulkCreateJobs();

  const [activeTab, setActiveTab] = useState("jobs");
  const [showAddJob, setShowAddJob] = useState(false);
  const [showEducationManager, setShowEducationManager] = useState(false);
  const [showServiceCategoriesManager, setShowServiceCategoriesManager] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkJobText, setBulkJobText] = useState("");
  const [bulkParseResult, setBulkParseResult] = useState<{ jobs: any[]; errors: string[]; skippedJobs: { title: string; reasons: string[] }[]; missingEducationFields: { name: string; suggestedLevel: string }[] } | null>(null);
  const [selectedEducationFields, setSelectedEducationFields] = useState<string[]>([]);
  
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

    if (!formData.title || !formData.department || formData.required_education_levels.length === 0 || !formData.last_date) {
      return;
    }

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
    };

    try {
      await createJob.mutateAsync(jobData);
      setShowAddJob(false);
      setFormData({
        title: "",
        department: "",
        description: "",
        required_education_levels: [],
        required_education_fields: [],
        min_age: "18",
        max_age: "35",
        gender_requirement: "",
        provinces: [],
        domicile: "",
        total_seats: "1",
        last_date: "",
        bank_challan_fee: "",
        post_office_fee: "",
        photocopy_fee: "",
        expert_fee: "",
      });
    } catch (error) {
      // Error handled in mutation
    }
  };


  const handleDeleteJob = async (id: string) => {
    if (confirm("Are you sure you want to delete this job?")) {
      await deleteJob.mutateAsync(id);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await toggleJobStatus.mutateAsync({ id, is_active: !currentStatus });
  };

  const handleParseBulkJobs = () => {
    const validationOptions: ValidationOptions = {
      educationLevels: educationLevels,
      educationFields: educationFields,
      provinces: PROVINCE_OPTIONS,
    };
    const result = parseJobsFromText(bulkJobText, validationOptions);
    setBulkParseResult(result);
    
    // Show toast for skipped jobs
    if (result.skippedJobs.length > 0) {
      toast({
        title: `${result.skippedJobs.length} job(s) skipped`,
        description: "Some jobs have invalid categories. Check the preview for details.",
        variant: "destructive",
      });
    }
    
    // Show toast for missing education fields
    if (result.missingEducationFields.length > 0) {
      toast({
        title: `${result.missingEducationFields.length} education field(s) missing`,
        description: "Add the missing fields via 'Manage Education' to import all jobs.",
        variant: "destructive",
      });
    }
  };

  const handleBulkImport = async () => {
    if (!bulkParseResult || bulkParseResult.jobs.length === 0) return;
    
    try {
      await bulkCreateJobs.mutateAsync(bulkParseResult.jobs);
      setShowBulkImport(false);
      setBulkJobText("");
      setBulkParseResult(null);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleCopySample = () => {
    navigator.clipboard.writeText(BULK_JOB_SAMPLE);
    toast({
      title: "Copied!",
      description: "Sample format copied to clipboard",
    });
  };

  // Stats
  const activeJobs = jobs?.filter((j) => j.is_active).length || 0;
  const totalApplications = applications?.length || 0;
  const totalRevenue = applications?.reduce((sum, app) => sum + (Number(app.payment_amount) || 0), 0) || 0;

  return (
    <div className="py-8">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage jobs, users, and applications
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={showServiceCategoriesManager} onOpenChange={setShowServiceCategoriesManager}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Tag className="h-4 w-4" />
                  Manage Services
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manage Service Categories</DialogTitle>
                </DialogHeader>
                <ServiceCategoriesManager />
              </DialogContent>
            </Dialog>
            <Dialog open={showEducationManager} onOpenChange={setShowEducationManager}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Manage Education
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manage Education Levels & Fields</DialogTitle>
                </DialogHeader>
                <EducationFieldsManager />
              </DialogContent>
            </Dialog>
            <Dialog open={showBulkImport} onOpenChange={(open) => {
              setShowBulkImport(open);
              if (!open) {
                setBulkJobText("");
                setBulkParseResult(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FileUp className="h-4 w-4" />
                  Add Multiple Jobs
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Bulk Import Jobs</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Paste job data below. Each job starts with "Title:" on a new line.
                    </p>
                    <Button variant="outline" size="sm" onClick={handleCopySample} className="gap-2">
                      <Copy className="h-3 w-3" />
                      Copy Sample Format
                    </Button>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-4 text-xs font-mono">
                    <p className="font-semibold mb-2">Sample Format:</p>
                    <pre className="whitespace-pre-wrap text-muted-foreground">
{`Title: Assistant Sub Inspector
Department: Punjab Police
Description: Assist in maintaining law and order
Education Level: matric, intermediate
Education Field: science, arts
Min Age: 18
Max Age: 30
Gender: male (or female, any)
Provinces: Punjab, Sindh
Domicile: Punjab
Total Seats: 500
Last Date: 2026-03-15
Bank Challan Fee: 500
Post Office Fee: 200
Photocopy Fee: 100
Expert Fee: 1000

Title: Junior Clerk
Department: Ministry of Finance
...`}
                    </pre>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Paste Job Data</Label>
                    <Textarea
                      placeholder="Paste your job data here..."
                      rows={10}
                      value={bulkJobText}
                      onChange={(e) => {
                        setBulkJobText(e.target.value);
                        setBulkParseResult(null);
                      }}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleParseBulkJobs}
                      disabled={!bulkJobText.trim()}
                    >
                      Preview Jobs
                    </Button>
                    {bulkParseResult && bulkParseResult.jobs.length > 0 && (
                      <Button 
                        onClick={handleBulkImport}
                        disabled={bulkCreateJobs.isPending}
                        className="gap-2"
                      >
                        {bulkCreateJobs.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Import {bulkParseResult.jobs.length} Job{bulkParseResult.jobs.length > 1 ? 's' : ''}
                      </Button>
                    )}
                  </div>
                  
                  {bulkParseResult && (
                    <ScrollArea className="h-80 rounded-lg border p-4">
                      <div className="space-y-4">
                        {/* Validation Errors Component */}
                        <BulkImportValidationErrors
                          errors={bulkParseResult.errors}
                          skippedJobs={bulkParseResult.skippedJobs}
                          missingEducationFields={bulkParseResult.missingEducationFields || []}
                          validJobsCount={bulkParseResult.jobs.length}
                          educationLevels={educationLevels}
                          onOpenEducationManager={() => setShowEducationManager(true)}
                        />
                        
                        {/* Valid Jobs List */}
                        {bulkParseResult.jobs.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-sm font-medium text-success mb-3 flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-success" />
                              {bulkParseResult.jobs.length} job{bulkParseResult.jobs.length > 1 ? 's' : ''} ready to import
                            </p>
                            <div className="space-y-2">
                              {bulkParseResult.jobs.map((job, i) => (
                                <div key={i} className="p-3 bg-muted/50 border rounded-md">
                                  <p className="font-medium text-sm">{job.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {job.department} • {job.total_seats} seat{job.total_seats > 1 ? 's' : ''} • Last date: {job.last_date}
                                  </p>
                                  {job.required_education_levels && job.required_education_levels.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {job.required_education_levels.map((level: string, j: number) => (
                                        <span key={j} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                          {educationLevels.find(l => l.value === level)?.label || level}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={() => setShowAddJob(!showAddJob)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Job
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeJobs}</p>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{jobs?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalApplications}</p>
                <p className="text-sm text-muted-foreground">Applications</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">Rs. {(totalRevenue / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground">Revenue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Job Form */}
        {showAddJob && (
          <div className="card-elevated p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Add New Government Job
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-medium text-foreground">Job Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title *</Label>
                    <Input 
                      id="title" 
                      placeholder="e.g., Assistant Sub Inspector" 
                      value={formData.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Input 
                      id="department" 
                      placeholder="e.g., Punjab Police"
                      value={formData.department}
                      onChange={(e) => handleChange("department", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Job description and responsibilities..."
                      rows={3}
                      value={formData.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="seats">Total Seats *</Label>
                      <Input 
                        id="seats" 
                        type="number" 
                        placeholder="500"
                        value={formData.total_seats}
                        onChange={(e) => handleChange("total_seats", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastDate">Last Date *</Label>
                      <Input 
                        id="lastDate" 
                        type="date"
                        value={formData.last_date}
                        onChange={(e) => handleChange("last_date", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Eligibility */}
                <div className="space-y-4">
                  <h3 className="font-medium text-foreground">Eligibility Criteria</h3>
                  <div className="space-y-2">
                    <Label>Required Education Levels *</Label>
                    <MultiSelect
                      options={educationLevels}
                      selected={formData.required_education_levels}
                      onChange={(selected) => {
                        handleChange("required_education_levels", selected);
                        // Clear fields that are no longer valid
                        const validFields = formData.required_education_fields.filter((fieldId) => {
                          const field = educationFields.find((f) => f.id === fieldId);
                          return field && selected.includes(field.education_level);
                        });
                        handleChange("required_education_fields", validFields);
                      }}
                      placeholder="Select education levels..."
                    />
                  </div>
                  {availableFieldsForSelectedLevels.length > 0 && (
                    <div className="space-y-2">
                      <Label>Required Education Fields (Optional)</Label>
                      <MultiSelect
                        options={educationFieldOptions}
                        selected={formData.required_education_fields}
                        onChange={(selected) => handleChange("required_education_fields", selected)}
                        placeholder="Any field within selected levels..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to accept any field within the selected education levels.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minAge">Minimum Age</Label>
                      <Input 
                        id="minAge" 
                        type="number" 
                        placeholder="18"
                        value={formData.min_age}
                        onChange={(e) => handleChange("min_age", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxAge">Maximum Age</Label>
                      <Input 
                        id="maxAge" 
                        type="number" 
                        placeholder="35"
                        value={formData.max_age}
                        onChange={(e) => handleChange("max_age", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender Requirement</Label>
                    <Select value={formData.gender_requirement} onValueChange={(v) => handleChange("gender_requirement", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Both Male & Female" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Both Male & Female</SelectItem>
                        <SelectItem value="male">Male Only</SelectItem>
                        <SelectItem value="female">Female Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Provinces</Label>
                    <MultiSelect
                      options={PROVINCE_OPTIONS}
                      selected={formData.provinces}
                      onChange={(selected) => handleChange("provinces", selected)}
                      placeholder="All Pakistan (leave empty)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domicile">Domicile</Label>
                    <Input 
                      id="domicile" 
                      placeholder="e.g., Lahore"
                      value={formData.domicile}
                      onChange={(e) => handleChange("domicile", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Fees */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Fee Breakdown (in PKR)</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="challan">Bank Challan Fee</Label>
                    <Input
                      id="challan"
                      type="number"
                      placeholder="500"
                      value={formData.bank_challan_fee}
                      onChange={(e) => handleChange("bank_challan_fee", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postOffice">Post Office Fee</Label>
                    <Input
                      id="postOffice"
                      type="number"
                      placeholder="300"
                      value={formData.post_office_fee}
                      onChange={(e) => handleChange("post_office_fee", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photocopy">Photocopy Charges</Label>
                    <Input
                      id="photocopy"
                      type="number"
                      placeholder="200"
                      value={formData.photocopy_fee}
                      onChange={(e) => handleChange("photocopy_fee", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expertService">Expert Service Fee</Label>
                    <Input
                      id="expertService"
                      type="number"
                      placeholder="1500"
                      value={formData.expert_fee}
                      onChange={(e) => handleChange("expert_fee", e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-4 rounded-lg bg-primary/10">
                  <Calculator className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">Total Calculated Cost:</span>
                  <span className="text-xl font-bold text-primary">
                    Rs. {totalFees.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={createJob.isPending}>
                  {createJob.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Job
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddJob(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2">
              <FileText className="h-4 w-4" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="work-requests" className="gap-2">
              <FileQuestion className="h-4 w-4" />
              Work Requests
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Live Chat
            </TabsTrigger>
            <TabsTrigger value="seo" className="gap-2">
              <Settings className="h-4 w-4" />
              SEO Settings
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
              <div className="card-elevated overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
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
                      {jobs?.map((job) => (
                        <tr key={job.id} className="border-t border-border">
                          <td className="p-4 font-medium text-foreground">{job.title}</td>
                          <td className="p-4 text-muted-foreground">{job.department}</td>
                          <td className="p-4 text-muted-foreground">{job.total_seats}</td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(job.last_date).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            Rs. {Number(job.total_fee).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <Badge className={job.is_active ? "bg-success" : "bg-muted"}>
                              {job.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleToggleStatus(job.id, job.is_active)}
                              >
                                {job.is_active ? (
                                  <XCircle className="h-4 w-4 text-warning" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 text-success" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteJob(job.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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
                        <th className="text-left p-4 font-medium text-foreground">Applied</th>
                        <th className="text-left p-4 font-medium text-foreground">Amount</th>
                        <th className="text-left p-4 font-medium text-foreground">Status</th>
                        <th className="text-right p-4 font-medium text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications?.map((app) => (
                        <tr key={app.id} className="border-t border-border">
                          <td className="p-4">
                            <p className="font-medium text-foreground">{app.profile?.full_name || 'Unknown'}</p>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-foreground">{app.job?.title}</p>
                              <p className="text-sm text-muted-foreground">{app.job?.department}</p>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(app.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            Rs. {Number(app.payment_amount).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <Select 
                              value={app.status}
                              onValueChange={(value) => updateApplicationStatus.mutate({ 
                                id: app.id, 
                                status: value as any 
                              })}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
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
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={async () => {
                                  try {
                                    await adminStartConversation.mutateAsync({
                                      userId: app.user_id,
                                      applicationId: app.id,
                                      jobTitle: app.job?.title || 'Job Application',
                                    });
                                    setActiveTab("chat");
                                    toast({
                                      title: "Conversation started",
                                      description: `Chat opened with ${app.profile?.full_name || 'user'}`,
                                    });
                                  } catch (error) {
                                    console.error('Failed to start conversation:', error);
                                  }
                                }}
                                title="Start Chat"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
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
                        <th className="text-left p-4 font-medium text-foreground">Category</th>
                        <th className="text-left p-4 font-medium text-foreground">Description</th>
                        <th className="text-left p-4 font-medium text-foreground">Submitted</th>
                        <th className="text-left p-4 font-medium text-foreground">Amount</th>
                        <th className="text-left p-4 font-medium text-foreground">Status</th>
                        <th className="text-right p-4 font-medium text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workRequests.map((wr) => (
                        <tr key={wr.id} className="border-t border-border">
                          <td className="p-4">
                            <p className="font-medium text-foreground">{wr.profile?.full_name || 'Unknown'}</p>
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary">
                              {wr.category?.display_name || 'Custom'}
                            </Badge>
                          </td>
                          <td className="p-4 max-w-xs">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {wr.custom_description}
                            </p>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(wr.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {wr.payment_amount ? `Rs. ${Number(wr.payment_amount).toLocaleString()}` : '—'}
                          </td>
                          <td className="p-4">
                            <Select 
                              value={wr.status}
                              onValueChange={(value) => updateWorkRequestStatus.mutate({ 
                                id: wr.id, 
                                status: value as any 
                              })}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
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
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                title="Start Chat"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
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
            <AdminChatPanel />
          </TabsContent>

          {/* SEO Settings Tab */}
          <TabsContent value="seo">
            <div className="card-elevated p-6">
              <SeoSettingsManager />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;