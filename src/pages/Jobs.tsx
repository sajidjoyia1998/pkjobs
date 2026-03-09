import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  GraduationCap,
  Calendar,
  Users,
  ArrowRight,
  Filter,
  Loader2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useJobs, Job } from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { isEligibleForJob, useUserEducations } from "@/hooks/useProfile";
import { useEducationFields } from "@/hooks/useEducationFields";

const educationLabels: Record<string, string> = {
  matric: "Matric / SSC",
  intermediate: "Intermediate",
  bachelor: "Bachelor's Degree",
  master: "Master's Degree",
  phd: "PhD / Doctorate",
};

const JOBS_PER_PAGE = 10;

const Jobs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedEducation, setSelectedEducation] = useState<string>("");
  const [showEligibleOnly, setShowEligibleOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>("active");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: jobs, isLoading, error } = useJobs({
    search: searchQuery,
    province: selectedProvince,
    education: selectedEducation,
  });

  const { profile, user } = useAuth();
  const { data: userEducations } = useUserEducations(user?.id);
  const { data: allEducationFields } = useEducationFields();

  const isJobExpired = (lastDate: string) => {
    return new Date(lastDate) < new Date(new Date().setHours(0, 0, 0, 0));
  };

  const getEligibilityBadge = (job: Job) => {
    if (isJobExpired(job.last_date)) {
      return (
        <Badge variant="outline" className="text-destructive border-destructive text-xs">
          Expired
        </Badge>
      );
    }
    if (!user || !profile) return null;
    const { eligible } = isEligibleForJob(profile, job, userEducations, allEducationFields);
    return (
      <Badge className={`text-xs ${eligible ? "bg-success" : "bg-destructive"}`}>
        {eligible ? "Eligible" : "Not Eligible"}
      </Badge>
    );
  };

  // Apply date + eligibility filters
  const filteredJobs = useMemo(() => {
    let result = jobs || [];

    // Date filter
    if (dateFilter === "active") {
      result = result.filter(job => !isJobExpired(job.last_date));
    } else if (dateFilter === "expired") {
      result = result.filter(job => isJobExpired(job.last_date));
    }

    // Eligibility filter
    if (showEligibleOnly && user && profile) {
      result = result.filter(job => {
        if (isJobExpired(job.last_date)) return false;
        const { eligible } = isEligibleForJob(profile, job, userEducations, allEducationFields);
        return eligible;
      });
    }

    return result;
  }, [jobs, dateFilter, showEligibleOnly, user, profile, userEducations, allEducationFields]);

  // Pagination
  const totalPages = Math.ceil((filteredJobs?.length || 0) / JOBS_PER_PAGE);
  const paginatedJobs = filteredJobs?.slice(
    (currentPage - 1) * JOBS_PER_PAGE,
    currentPage * JOBS_PER_PAGE
  );

  // Reset page when filters change
  const handleFilterChange = () => setCurrentPage(1);

  const formatAgeRange = (min: number, max: number) => `${min}-${max} years`;
  const formatEducationLevels = (levels: string[]) => {
    if (levels.length === 0) return "Any";
    if (levels.length === 1) return educationLabels[levels[0]] || levels[0];
    return levels.map(l => educationLabels[l] || l).join(", ");
  };
  const formatProvinces = (provinces: string[]) => {
    if (provinces.length === 0) return "All Pakistan";
    return provinces.join(", ");
  };

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="py-6 sm:py-8">
      <div className="container px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Government Jobs</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Browse and apply for government positions across Pakistan</p>
        </div>

        {/* Filters */}
        <div className="card-elevated p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Filter Jobs</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); handleFilterChange(); }}
                className="pl-10"
              />
            </div>
            <Select value={selectedProvince} onValueChange={(v) => { setSelectedProvince(v); handleFilterChange(); }}>
              <SelectTrigger>
                <SelectValue placeholder="All Provinces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Provinces</SelectItem>
                <SelectItem value="Punjab">Punjab</SelectItem>
                <SelectItem value="Sindh">Sindh</SelectItem>
                <SelectItem value="Khyber Pakhtunkhwa">KPK</SelectItem>
                <SelectItem value="Balochistan">Balochistan</SelectItem>
                <SelectItem value="Islamabad">Islamabad</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedEducation} onValueChange={(v) => { setSelectedEducation(v); handleFilterChange(); }}>
              <SelectTrigger>
                <SelectValue placeholder="All Education" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Education</SelectItem>
                <SelectItem value="matric">Matric</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="bachelor">Bachelor's</SelectItem>
                <SelectItem value="master">Master's</SelectItem>
                <SelectItem value="phd">PhD</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); handleFilterChange(); }}>
              <SelectTrigger>
                <SelectValue placeholder="Job Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Jobs</SelectItem>
                <SelectItem value="expired">Expired Jobs</SelectItem>
                <SelectItem value="all">All Jobs</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSearchQuery("");
                setSelectedProvince("");
                setSelectedEducation("");
                setShowEligibleOnly(false);
                setDateFilter("active");
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
          {user && profile && (
            <div className="mt-4">
              <Button
                variant={showEligibleOnly ? "default" : "outline"}
                size="sm"
                onClick={() => { setShowEligibleOnly(!showEligibleOnly); handleFilterChange(); }}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {showEligibleOnly ? "Showing Eligible Jobs" : "Show My Eligible Jobs"}
              </Button>
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `Showing ${paginatedJobs?.length || 0} of ${filteredJobs?.length || 0} jobs`}
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load jobs. Please try again.</p>
          </div>
        )}

        {/* Job Cards */}
        {!isLoading && !error && (
          <div className="grid gap-3 sm:gap-4">
            {paginatedJobs?.map((job) => {
              const expired = isJobExpired(job.last_date);
              return (
                <div key={job.id} className={`card-elevated p-4 sm:p-6 ${expired ? "opacity-60" : ""}`}>
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {/* Title row */}
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-xl font-semibold text-foreground truncate">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">{job.department}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="text-xs">{job.total_seats} seats</Badge>
                        {getEligibilityBadge(job)}
                      </div>
                    </div>

                    {/* Info row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-none">{formatEducationLevels(job.required_education_levels)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        {formatAgeRange(job.min_age, job.max_age)}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        <span className="truncate max-w-[120px] sm:max-w-none">{formatProvinces(job.provinces)}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${expired ? "text-destructive" : "text-muted-foreground"}`}>
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        {expired ? "Expired: " : "Last: "}
                        {new Date(job.last_date).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Cost</p>
                        <p className="text-lg sm:text-xl font-bold text-primary">Rs. {Number(job.total_fee).toLocaleString()}</p>
                      </div>
                      <Link to={`/jobs/${job.id}`}>
                        <Button variant={expired ? "outline" : "default"} size="sm" className="gap-1.5">
                          View Details
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredJobs?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {showEligibleOnly
                ? "No eligible jobs found. Try updating your profile or clearing filters."
                : "No jobs found matching your criteria."}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 sm:gap-2 mt-8 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            {getPageNumbers().map((page, i) =>
              page === "..." ? (
                <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
              ) : (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className="min-w-[36px]"
                  onClick={() => setCurrentPage(page as number)}
                >
                  {page}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Jobs;
