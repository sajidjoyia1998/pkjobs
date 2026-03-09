import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Edit,
  Link,
  Plus,
} from "lucide-react";

export interface EditableJob {
  title: string;
  department: string;
  description?: string;
  required_education_levels: string[];
  required_education_fields?: string[];
  min_age: number;
  max_age: number;
  gender_requirement?: "male" | "female" | "other" | null;
  provinces?: string[];
  domicile?: string;
  total_seats: number;
  last_date: string;
  bank_challan_fee: number;
  post_office_fee: number;
  photocopy_fee: number;
  expert_fee: number;
  advertisement_link?: string;
  advertisement_image?: string;
}

interface BulkJobPreviewEditorProps {
  jobs: EditableJob[];
  errors: string[];
  educationLevels: { value: string; label: string }[];
  educationFields: { id: string; name: string; display_name: string; education_level: string }[];
  provinceOptions: { value: string; label: string }[];
  onJobsChange: (jobs: EditableJob[]) => void;
  onImport: () => void;
  isImporting: boolean;
  fullPage?: boolean;
}

const getMissingFields = (job: EditableJob): string[] => {
  const missing: string[] = [];
  if (!job.title) missing.push("Title");
  if (!job.department) missing.push("Department");
  if (!job.required_education_levels || job.required_education_levels.length === 0) missing.push("Education Levels");
  if (!job.last_date) missing.push("Last Date");
  return missing;
};

const getEmptyOptionalFields = (job: EditableJob): string[] => {
  const empty: string[] = [];
  if (!job.description) empty.push("Description");
  if (!job.required_education_fields || job.required_education_fields.length === 0) empty.push("Education Fields");
  if (!job.provinces || job.provinces.length === 0) empty.push("Provinces");
  if (!job.domicile) empty.push("Domicile");
  if (!job.gender_requirement) empty.push("Gender");
  if (!job.bank_challan_fee) empty.push("Challan Fee");
  if (!job.post_office_fee) empty.push("PO Fee");
  if (!job.photocopy_fee) empty.push("Photocopy Fee");
  if (!job.expert_fee) empty.push("Expert Fee");
  if (!job.advertisement_link) empty.push("Ad Link");
  if (!job.advertisement_image) empty.push("Ad Image");
  return empty;
};

const FieldWrapper = ({ label, required, isEmpty, children }: { label: string; required?: boolean; isEmpty?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs flex items-center gap-1">
      {label}
      {required && <span className="text-destructive">*</span>}
      {isEmpty && required && <AlertTriangle className="h-3 w-3 text-destructive" />}
      {isEmpty && !required && <span className="text-[10px] text-muted-foreground">(not set)</span>}
    </Label>
    {children}
  </div>
);

const BulkJobPreviewEditor = ({
  jobs,
  errors,
  educationLevels,
  educationFields,
  provinceOptions,
  onJobsChange,
  onImport,
  isImporting,
  fullPage = false,
}: BulkJobPreviewEditorProps) => {
  const [expandedJobs, setExpandedJobs] = useState<Record<number, boolean>>(
    () => Object.fromEntries(jobs.map((_, i) => [i, true]))
  );

  const toggleJob = (index: number) => {
    setExpandedJobs((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const updateJob = (index: number, updates: Partial<EditableJob>) => {
    const updated = [...jobs];
    updated[index] = { ...updated[index], ...updates };
    onJobsChange(updated);
  };

  const removeJob = (index: number) => {
    onJobsChange(jobs.filter((_, i) => i !== index));
  };

  const addEmptyJob = () => {
    const newJob: EditableJob = {
      title: "",
      department: "",
      required_education_levels: [],
      min_age: 18,
      max_age: 35,
      total_seats: 1,
      last_date: "",
      bank_challan_fee: 0,
      post_office_fee: 0,
      photocopy_fee: 0,
      expert_fee: 0,
    };
    onJobsChange([...jobs, newJob]);
    setExpandedJobs((prev) => ({ ...prev, [jobs.length]: true }));
  };

  const getFieldOptionsForLevels = (levels: string[]) => {
    return educationFields
      .filter((f) => levels.includes(f.education_level))
      .map((f) => ({
        value: f.id,
        label: `${f.display_name} (${educationLevels.find((l) => l.value === f.education_level)?.label || f.education_level})`,
      }));
  };

  const canImport = jobs.length > 0 && jobs.every((j) => getMissingFields(j).length === 0);

  const collapseAll = () => setExpandedJobs(Object.fromEntries(jobs.map((_, i) => [i, false])));
  const expandAll = () => setExpandedJobs(Object.fromEntries(jobs.map((_, i) => [i, true])));

  return (
    <div className="space-y-4">
      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            {errors.length} issue(s) found
          </p>
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{err}</p>
          ))}
        </div>
      )}

      {/* Jobs */}
      {jobs.length > 0 && (
        <div className={errors.length > 0 ? "pt-2 border-t" : ""}>
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                {jobs.length} job{jobs.length > 1 ? "s" : ""} — review &amp; edit before importing
              </p>
              {!canImport && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  Some jobs have missing required fields (marked with *)
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs h-7">
                Collapse All
              </Button>
              <Button variant="outline" size="sm" onClick={expandAll} className="text-xs h-7">
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={addEmptyJob} className="text-xs h-7 gap-1">
                <Plus className="h-3 w-3" />
                Add Job
              </Button>
              <Button onClick={onImport} disabled={isImporting || !canImport} size="sm" className="shrink-0">
                {isImporting ? "Importing..." : `Import ${jobs.length} Job${jobs.length > 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>

          {/* Job cards */}
          <div className="space-y-4">
            {jobs.map((job, i) => {
              const missingFields = getMissingFields(job);
              const emptyOptional = getEmptyOptionalFields(job);
              const totalFee = (job.bank_challan_fee || 0) + (job.post_office_fee || 0) + (job.photocopy_fee || 0) + (job.expert_fee || 0);

              return (
                <Collapsible key={i} open={expandedJobs[i]} onOpenChange={() => toggleJob(i)}>
                  <div className={`border rounded-lg bg-card overflow-hidden ${missingFields.length > 0 ? "border-destructive/50" : ""}`}>
                    {/* Header */}
                    <CollapsibleTrigger className="w-full p-3 sm:p-4 flex items-center gap-2 sm:gap-3 text-left hover:bg-muted/50 transition-colors">
                      {expandedJobs[i] ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{job.title || "Untitled Job"}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground truncate">
                            {job.department || "No department"} • {job.total_seats} seat{job.total_seats > 1 ? "s" : ""}
                          </span>
                          {missingFields.length > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              {missingFields.length} required missing
                            </Badge>
                          )}
                          {emptyOptional.length > 0 && missingFields.length === 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                              {emptyOptional.length} optional empty
                            </Badge>
                          )}
                          {totalFee > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                              Rs. {totalFee}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); removeJob(i); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="p-3 sm:p-5 pt-3 space-y-5 border-t">
                        {/* Missing fields alert */}
                        {missingFields.length > 0 && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-destructive">Missing required fields:</p>
                              <p className="text-xs text-destructive/80 mt-0.5">{missingFields.join(", ")}</p>
                            </div>
                          </div>
                        )}

                        {/* Empty optional info */}
                        {emptyOptional.length > 0 && missingFields.length === 0 && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
                            <Edit className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Optional fields not set:</p>
                              <p className="text-xs text-muted-foreground/80 mt-0.5">{emptyOptional.join(", ")}</p>
                            </div>
                          </div>
                        )}

                        {/* Basic Info */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Basic Information</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FieldWrapper label="Title" required isEmpty={!job.title}>
                              <Input
                                value={job.title}
                                onChange={(e) => updateJob(i, { title: e.target.value })}
                                className={`h-9 text-sm ${!job.title ? "border-destructive" : ""}`}
                                placeholder="Enter job title"
                              />
                            </FieldWrapper>
                            <FieldWrapper label="Department" required isEmpty={!job.department}>
                              <Input
                                value={job.department}
                                onChange={(e) => updateJob(i, { department: e.target.value })}
                                className={`h-9 text-sm ${!job.department ? "border-destructive" : ""}`}
                                placeholder="Enter department"
                              />
                            </FieldWrapper>
                          </div>
                          <div className="mt-3">
                            <FieldWrapper label="Description" isEmpty={!job.description}>
                              <Textarea
                                value={job.description || ""}
                                onChange={(e) => updateJob(i, { description: e.target.value })}
                                rows={2}
                                className="text-sm"
                                placeholder="Enter job description"
                              />
                            </FieldWrapper>
                          </div>
                        </div>

                        {/* Education Requirements */}
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                          <p className="text-xs font-semibold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                            <Edit className="h-3.5 w-3.5" />
                            Education Requirements
                          </p>
                          <FieldWrapper label="Education Levels" required isEmpty={!job.required_education_levels?.length}>
                            <MultiSelect
                              options={educationLevels}
                              selected={job.required_education_levels}
                              onChange={(selected) => {
                                const validFields = (job.required_education_fields || []).filter((fid) => {
                                  const f = educationFields.find((ef) => ef.id === fid);
                                  return f && selected.includes(f.education_level);
                                });
                                updateJob(i, {
                                  required_education_levels: selected,
                                  required_education_fields: validFields.length > 0 ? validFields : undefined,
                                });
                              }}
                              placeholder="Select education levels..."
                            />
                          </FieldWrapper>
                          {getFieldOptionsForLevels(job.required_education_levels).length > 0 && (
                            <FieldWrapper label="Specializations / Fields" isEmpty={!job.required_education_fields?.length}>
                              <MultiSelect
                                options={getFieldOptionsForLevels(job.required_education_levels)}
                                selected={job.required_education_fields || []}
                                onChange={(selected) =>
                                  updateJob(i, { required_education_fields: selected.length > 0 ? selected : undefined })
                                }
                                placeholder="Any field (leave empty for all)..."
                              />
                            </FieldWrapper>
                          )}
                        </div>

                        {/* Eligibility */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Eligibility</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <FieldWrapper label="Min Age">
                              <Input
                                type="number"
                                value={job.min_age}
                                onChange={(e) => updateJob(i, { min_age: parseInt(e.target.value) || 18 })}
                                className="h-9 text-sm"
                              />
                            </FieldWrapper>
                            <FieldWrapper label="Max Age">
                              <Input
                                type="number"
                                value={job.max_age}
                                onChange={(e) => updateJob(i, { max_age: parseInt(e.target.value) || 35 })}
                                className="h-9 text-sm"
                              />
                            </FieldWrapper>
                            <FieldWrapper label="Gender" isEmpty={!job.gender_requirement}>
                              <Select
                                value={job.gender_requirement || "any"}
                                onValueChange={(v) => updateJob(i, { gender_requirement: v === "any" ? null : (v as any) })}
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="any">Any</SelectItem>
                                  <SelectItem value="male">Male</SelectItem>
                                  <SelectItem value="female">Female</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </FieldWrapper>
                            <FieldWrapper label="Total Seats">
                              <Input
                                type="number"
                                value={job.total_seats}
                                onChange={(e) => updateJob(i, { total_seats: parseInt(e.target.value) || 1 })}
                                className="h-9 text-sm"
                              />
                            </FieldWrapper>
                          </div>
                        </div>

                        {/* Location & Date */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Location &amp; Date</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <FieldWrapper label="Provinces" isEmpty={!job.provinces?.length}>
                              <MultiSelect
                                options={provinceOptions}
                                selected={job.provinces || []}
                                onChange={(selected) => updateJob(i, { provinces: selected.length > 0 ? selected : undefined })}
                                placeholder="All Pakistan"
                              />
                            </FieldWrapper>
                            <FieldWrapper label="Domicile" isEmpty={!job.domicile}>
                              <Input
                                value={job.domicile || ""}
                                onChange={(e) => updateJob(i, { domicile: e.target.value || undefined })}
                                className="h-9 text-sm"
                                placeholder="e.g. Punjab"
                              />
                            </FieldWrapper>
                            <FieldWrapper label="Last Date" required isEmpty={!job.last_date}>
                              <Input
                                type="date"
                                value={job.last_date}
                                onChange={(e) => updateJob(i, { last_date: e.target.value })}
                                className={`h-9 text-sm ${!job.last_date ? "border-destructive" : ""}`}
                              />
                            </FieldWrapper>
                          </div>
                        </div>

                        {/* Fees */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Fee Structure</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <FieldWrapper label="Challan Fee" isEmpty={!job.bank_challan_fee}>
                              <Input
                                type="number"
                                value={job.bank_challan_fee}
                                onChange={(e) => updateJob(i, { bank_challan_fee: parseInt(e.target.value) || 0 })}
                                className="h-9 text-sm"
                                placeholder="0"
                              />
                            </FieldWrapper>
                            <FieldWrapper label="PO Fee" isEmpty={!job.post_office_fee}>
                              <Input
                                type="number"
                                value={job.post_office_fee}
                                onChange={(e) => updateJob(i, { post_office_fee: parseInt(e.target.value) || 0 })}
                                className="h-9 text-sm"
                                placeholder="0"
                              />
                            </FieldWrapper>
                            <FieldWrapper label="Photocopy Fee" isEmpty={!job.photocopy_fee}>
                              <Input
                                type="number"
                                value={job.photocopy_fee}
                                onChange={(e) => updateJob(i, { photocopy_fee: parseInt(e.target.value) || 0 })}
                                className="h-9 text-sm"
                                placeholder="0"
                              />
                            </FieldWrapper>
                            <FieldWrapper label="Expert Fee" isEmpty={!job.expert_fee}>
                              <Input
                                type="number"
                                value={job.expert_fee}
                                onChange={(e) => updateJob(i, { expert_fee: parseInt(e.target.value) || 0 })}
                                className="h-9 text-sm"
                                placeholder="0"
                              />
                            </FieldWrapper>
                          </div>
                          <div className="flex items-center justify-end gap-2 text-sm mt-2">
                            <span className="text-muted-foreground">Total Fee:</span>
                            <Badge variant="secondary" className="font-mono text-sm">
                              Rs. {totalFee}
                            </Badge>
                          </div>
                        </div>

                        {/* Advertisement */}
                        <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                            <Link className="h-3.5 w-3.5" />
                            Advertisement Details
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FieldWrapper label="Ad Link (URL)" isEmpty={!job.advertisement_link}>
                              <Input
                                value={job.advertisement_link || ""}
                                onChange={(e) => updateJob(i, { advertisement_link: e.target.value || undefined })}
                                placeholder="https://..."
                                className="h-9 text-sm"
                              />
                            </FieldWrapper>
                            <FieldWrapper label="Ad Image URL" isEmpty={!job.advertisement_image}>
                              <Input
                                value={job.advertisement_image || ""}
                                onChange={(e) => updateJob(i, { advertisement_image: e.target.value || undefined })}
                                placeholder="https://..."
                                className="h-9 text-sm"
                              />
                            </FieldWrapper>
                          </div>
                          {job.advertisement_image && (
                            <img
                              src={job.advertisement_image}
                              alt="Ad preview"
                              className="max-h-32 rounded border object-cover"
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>

          {/* Bottom import bar */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-4 mt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {jobs.length} job{jobs.length > 1 ? "s" : ""} ready
              {!canImport && " — fix required fields to import"}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={addEmptyJob} className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add Job Manually
              </Button>
              <Button onClick={onImport} disabled={isImporting || !canImport}>
                {isImporting ? "Importing..." : `Import ${jobs.length} Job${jobs.length > 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {jobs.length === 0 && errors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No jobs found in the pasted text.</p>
          <Button variant="outline" onClick={addEmptyJob} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Job Manually
          </Button>
        </div>
      )}
    </div>
  );
};

export default BulkJobPreviewEditor;
