import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  GraduationCap,
  MapPin,
  Users,
  Banknote,
  CheckCircle,
  AlertCircle,
  Building2,
  Clock,
  FileText,
  Loader2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useJob } from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { useCreateApplication, useCheckIfApplied } from "@/hooks/useApplications";
import { isEligibleForJob, useUserEducations } from "@/hooks/useProfile";
import { useEducationFields } from "@/hooks/useEducationFields";
import { toast } from "sonner";
import ShareButtons from "@/components/ShareButtons";
import TestPrepBanner from "@/components/TestPrepBanner";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const educationLabels: Record<string, string> = {
  matric: "Matric / SSC",
  intermediate: "Intermediate",
  bachelor: "Bachelor's Degree",
  master: "Master's Degree",
  phd: "PhD / Doctorate",
};

const EducationEligibilityCard = ({ job, allEducationFields }: { job: any; allEducationFields: any[] | undefined }) => {
  const [showAll, setShowAll] = useState(false);

  const levels = (job.required_education_levels || []).map((l: string) => educationLabels[l] || l);
  const fieldIds = job.required_education_fields || [];
  const fields = allEducationFields
    ? fieldIds.map((id: string) => allEducationFields.find((f) => f.id === id)?.display_name).filter(Boolean)
    : [];

  const visibleFields = showAll ? fields : fields.slice(0, 3);
  const remaining = fields.length - 3;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <GraduationCap className="h-5 w-5 text-primary mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Education</p>
        <p className="font-medium text-foreground">
          {levels.length > 0 ? levels.join(", ") : "Any"}
        </p>
        {fields.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {visibleFields.map((f: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {f}
              </Badge>
            ))}
            {!showAll && remaining > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-accent"
                    onClick={() => setShowAll(true)}
                  >
                    +{remaining} more
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="flex flex-wrap gap-1">
                    {fields.slice(3).map((f: string, i: number) => (
                      <span key={i} className="text-xs">{f}{i < fields.slice(3).length - 1 ? ", " : ""}</span>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            {showAll && fields.length > 3 && (
              <Badge
                variant="outline"
                className="text-xs cursor-pointer hover:bg-accent"
                onClick={() => setShowAll(false)}
              >
                Show less
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: job, isLoading, error } = useJob(id);
  const { user, profile } = useAuth();
  const { data: userEducations } = useUserEducations(user?.id);
  const { data: allEducationFields } = useEducationFields();
  const { data: hasApplied } = useCheckIfApplied(id);
  const createApplication = useCreateApplication();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="py-8">
        <div className="container max-w-5xl">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Link>
          <div className="text-center py-12">
            <p className="text-destructive">Job not found or failed to load.</p>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = new Date(job.last_date) < new Date(new Date().setHours(0, 0, 0, 0));

  const eligibility = profile
    ? isEligibleForJob(profile, job, userEducations, allEducationFields)
    : { eligible: false, reasons: ["Please complete your profile to check eligibility"] };

  const formatProvinces = (provinces: string[]) => {
    if (provinces.length === 0) return "All Pakistan";
    return provinces.join(", ");
  };

  const canApply = !isExpired && !hasApplied && user && eligibility.eligible;

  const handleApply = async () => {
    if (!user) {
      toast.error("Please sign in to apply for this job");
      navigate("/auth");
      return;
    }

    if (!profile) {
      toast.error("Please complete your profile before applying");
      navigate("/dashboard");
      return;
    }

    if (!eligibility.eligible) {
      toast.error("You are not eligible for this job");
      return;
    }

    try {
      await createApplication.mutateAsync({
        job_id: job.id,
        payment_amount: Number(job.total_fee),
      });
      navigate("/dashboard");
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        {/* Back button */}
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        <TestPrepBanner enabled={!!(job as any).test_preparation_available} />

        <div className="grid lg:grid-cols-3 gap-8 mt-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="card-elevated p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    {job.title}
                  </h1>
                  <p className="text-lg text-muted-foreground">{job.department}</p>
                </div>
                {isExpired ? (
                  <Badge variant="outline" className="text-destructive border-destructive">
                    Deadline Passed
                  </Badge>
                ) : (
                  <Badge className={eligibility.eligible ? "bg-success" : "bg-destructive"}>
                    {eligibility.eligible ? "Eligible" : "Not Eligible"}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">{job.total_seats} seats</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">{job.min_age}-{job.max_age} years</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${isExpired ? "text-destructive" : ""}`}>
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className={isExpired ? "text-destructive font-medium" : "text-muted-foreground"}>
                    {isExpired ? "Deadline Passed: " : "Due: "}
                    {new Date(job.last_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">
                    Posted: {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            {job.description && (
              <div className="card-elevated p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Job Description
                </h2>
                <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
              </div>
            )}

            {/* Eligibility */}
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Eligibility Criteria
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
              <EducationEligibilityCard job={job} allEducationFields={allEducationFields} />
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Age Limit</p>
                    <p className="font-medium text-foreground">{job.min_age}-{job.max_age} years</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium text-foreground">
                      {job.gender_requirement ? job.gender_requirement.charAt(0).toUpperCase() + job.gender_requirement.slice(1) : "Both Male & Female"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Province / Domicile</p>
                    <p className="font-medium text-foreground">
                      {formatProvinces(job.provinces)} {job.domicile && `(${job.domicile})`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Eligibility Reasons */}
              {!eligibility.eligible && eligibility.reasons.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Not Eligible Because:
                  </h3>
                  <ul className="space-y-1">
                    {eligibility.reasons.map((reason, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span>•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Fee Breakdown */}
            <div className="card-elevated p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Fee Breakdown
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Challan Fee</span>
                  <span className="font-medium">
                    Rs. {Number(job.bank_challan_fee).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Post Office Fee</span>
                  <span className="font-medium">
                    Rs. {Number(job.post_office_fee).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Photocopy Charges</span>
                  <span className="font-medium">
                    Rs. {Number(job.photocopy_fee).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expert Service Fee</span>
                  <span className="font-medium">
                    Rs. {Number(job.expert_fee).toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-primary">
                    Rs. {Number(job.total_fee).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {isExpired ? (
                  <Button className="w-full" size="lg" variant="outline" disabled>
                    <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
                    Application Deadline Passed
                  </Button>
                ) : hasApplied ? (
                  <Button className="w-full" size="lg" disabled>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Already Applied
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleApply}
                    disabled={createApplication.isPending || !canApply}
                  >
                    {createApplication.isPending ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Banknote className="h-5 w-5 mr-2" />
                    )}
                    Apply for Me - Rs. {Number(job.total_fee).toLocaleString()}
                  </Button>
                )}
                {!isExpired && (
                  <p className="text-xs text-center text-muted-foreground">
                    We'll take care of everything for you
                  </p>
                )}
                {!isExpired && job.advertisement_link && (
                  <a
                    href={job.advertisement_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full" size="lg">
                      <ExternalLink className="h-5 w-5 mr-2" />
                      Apply on Your Own
                    </Button>
                  </a>
                )}
              </div>

              {/* Share Buttons */}
              <div className="mt-6 pt-4 border-t border-border">
                <ShareButtons 
                  title={job.title}
                  url={`${window.location.origin}/jobs/${job.id}`}
                  description={`${job.department} - ${job.total_seats} seats available. Apply before ${new Date(job.last_date).toLocaleDateString()}`}
                />
              </div>

              {/* Warning */}
              {isExpired ? (
                <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex gap-3">
                    <XCircle className="h-5 w-5 text-destructive shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Deadline Passed
                      </p>
                      <p className="text-sm text-muted-foreground">
                        The application deadline for this job was {new Date(job.last_date).toLocaleDateString()}. 
                        This job is no longer accepting applications.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-warning shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Application Deadline
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Apply before {new Date(job.last_date).toLocaleDateString()} to
                        avoid missing this opportunity.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;