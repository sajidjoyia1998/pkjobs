import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  MessageSquare,
  Search,
  Users,
  Send,
  Loader2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

interface EligibleUser {
  user_id: string;
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  province: string | null;
  domicile: string | null;
  education_levels: string[];
  age: number | null;
}

interface JobOption {
  id: string;
  title: string;
  department: string;
  last_date: string;
  min_age: number;
  max_age: number;
  gender_requirement: string | null;
  provinces: string[] | null;
  domicile: string | null;
  required_education_levels: string[] | null;
  total_seats: number;
}

const DEFAULT_TEMPLATE = `Assalam-o-Alaikum {name}!

🎯 You are eligible for the following government job:

📋 *{job_title}*
🏢 Department: {department}
📅 Last Date: {last_date}
💺 Total Seats: {total_seats}

✅ Your eligibility:
• Age: {age} years (Required: {min_age}-{max_age})
• Education: {education}
• Province: {province}

Apply now through our platform before the deadline!

👉 Visit: {site_url}`;

const calculateAge = (dob: string | null): number | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const useEligibleUsers = (job: JobOption | null) => {
  return useQuery({
    queryKey: ["eligible-users", job?.id],
    queryFn: async (): Promise<EligibleUser[]> => {
      if (!job) return [];

      // Get all profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, date_of_birth, gender, province, domicile");

      if (!profiles?.length) return [];

      // Get user educations
      const userIds = profiles.map((p) => p.user_id);
      const { data: educations } = await supabase
        .from("user_educations")
        .select("user_id, education_level")
        .in("user_id", userIds);

      const eduMap = new Map<string, string[]>();
      for (const e of educations || []) {
        const existing = eduMap.get(e.user_id) || [];
        existing.push(e.education_level);
        eduMap.set(e.user_id, existing);
      }

      // Filter eligible users
      return profiles
        .map((p) => ({
          ...p,
          education_levels: eduMap.get(p.user_id) || [],
          age: calculateAge(p.date_of_birth),
        }))
        .filter((u) => {
          // Age check
          if (u.age !== null && (u.age < job.min_age || u.age > job.max_age)) return false;

          // Gender check
          if (job.gender_requirement && u.gender && u.gender !== job.gender_requirement)
            return false;

          // Province check
          if (
            job.provinces?.length &&
            u.province &&
            !job.provinces.some(
              (p) =>
                p.toLowerCase() === u.province!.toLowerCase() ||
                p.toLowerCase().includes("all")
            )
          )
            return false;

          // Education check - hierarchical: user qualifies if their level >= required level
          const eduLevelRank = (level: string) => {
            const ranks: Record<string, number> = { matric: 1, intermediate: 2, bachelor: 3, master: 4, phd: 5 };
            return ranks[level] || 0;
          };
          if (
            job.required_education_levels?.length &&
            u.education_levels.length > 0
          ) {
            const minRequiredRank = Math.min(...job.required_education_levels.map(eduLevelRank));
            const userMaxRank = Math.max(...u.education_levels.map(eduLevelRank));
            if (userMaxRank < minRequiredRank) return false;
          } else if (
            job.required_education_levels?.length &&
            u.education_levels.length === 0
          ) {
            return false;
          }
            return false;

          return true;
        });
    },
    enabled: !!job,
  });
};

const WhatsAppBulkMessaging = () => {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_TEMPLATE);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewUser, setPreviewUser] = useState<EligibleUser | null>(null);
  const [sentUsers, setSentUsers] = useState<Set<string>>(new Set());

  // Fetch jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ["admin-jobs-for-whatsapp"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select(
          "id, title, department, last_date, min_age, max_age, gender_requirement, provinces, domicile, required_education_levels, total_seats"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return (data || []) as JobOption[];
    },
  });

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null;
  const { data: eligibleUsers = [], isLoading: loadingUsers } =
    useEligibleUsers(selectedJob);

  // Auto-select all eligible users with phone numbers when job changes
  const usersWithPhone = useMemo(
    () => eligibleUsers.filter((u) => u.phone),
    [eligibleUsers]
  );

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return eligibleUsers;
    const q = searchQuery.toLowerCase();
    return eligibleUsers.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.province?.toLowerCase().includes(q)
    );
  }, [eligibleUsers, searchQuery]);

  const handleJobChange = (jobId: string) => {
    setSelectedJobId(jobId);
    setSentUsers(new Set());
    // Will auto-select after data loads
    setSelectedUserIds(new Set());
  };

  // Auto-select users with phone when data loads
  useMemo(() => {
    if (usersWithPhone.length > 0 && selectedUserIds.size === 0) {
      setSelectedUserIds(new Set(usersWithPhone.map((u) => u.user_id)));
    }
  }, [usersWithPhone]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const n = new Set(prev);
      n.has(userId) ? n.delete(userId) : n.add(userId);
      return n;
    });
  };

  const toggleAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map((u) => u.user_id)));
    }
  };

  const generateMessage = (user: EligibleUser): string => {
    if (!selectedJob) return "";
    return messageTemplate
      .replace(/{name}/g, user.full_name)
      .replace(/{job_title}/g, selectedJob.title)
      .replace(/{department}/g, selectedJob.department)
      .replace(/{last_date}/g, new Date(selectedJob.last_date).toLocaleDateString("en-PK"))
      .replace(/{total_seats}/g, String(selectedJob.total_seats))
      .replace(/{min_age}/g, String(selectedJob.min_age))
      .replace(/{max_age}/g, String(selectedJob.max_age))
      .replace(/{age}/g, user.age !== null ? String(user.age) : "N/A")
      .replace(/{education}/g, user.education_levels.join(", ") || "N/A")
      .replace(/{province}/g, user.province || "N/A")
      .replace(/{gender}/g, user.gender || "N/A")
      .replace(/{domicile}/g, user.domicile || "N/A")
      .replace(/{site_url}/g, window.location.origin);
  };

  const formatPhone = (phone: string): string => {
    let cleaned = phone.replace(/[^0-9+]/g, "");
    // Convert 03xx to +9203xx
    if (cleaned.startsWith("0")) {
      cleaned = "+92" + cleaned.substring(1);
    }
    // Add + if starts with 92
    if (cleaned.startsWith("92")) {
      cleaned = "+" + cleaned;
    }
    return cleaned.replace("+", "");
  };

  const openWhatsApp = (user: EligibleUser) => {
    if (!user.phone) {
      toast.error("This user has no phone number");
      return;
    }
    const message = generateMessage(user);
    const phone = formatPhone(user.phone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    setSentUsers((prev) => new Set(prev).add(user.user_id));
  };

  const openAllWhatsApp = () => {
    const usersToSend = eligibleUsers.filter(
      (u) => selectedUserIds.has(u.user_id) && u.phone && !sentUsers.has(u.user_id)
    );
    if (usersToSend.length === 0) {
      toast.error("No users with phone numbers selected");
      return;
    }
    if (usersToSend.length > 10) {
      toast.info(
        `Opening ${usersToSend.length} WhatsApp windows. Your browser may block popups — please allow them.`
      );
    }
    // Open with slight delay to avoid popup blocking
    usersToSend.forEach((user, i) => {
      setTimeout(() => openWhatsApp(user), i * 500);
    });
  };

  const copyMessage = (user: EligibleUser) => {
    const message = generateMessage(user);
    navigator.clipboard.writeText(message);
    toast.success("Message copied to clipboard");
  };

  const selectedCount = [...selectedUserIds].filter((id) =>
    eligibleUsers.find((u) => u.user_id === id && u.phone)
  ).length;

  const noPhoneCount = eligibleUsers.filter((u) => !u.phone).length;

  return (
    <div className="space-y-6">
      {/* Job Selection */}
      <div className="card-elevated p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          WhatsApp Bulk Messaging
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Select Job to Notify About
            </label>
            <Select value={selectedJobId} onValueChange={handleJobChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a job..." />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title} — {job.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedJob && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Age: {selectedJob.min_age}-{selectedJob.max_age}</Badge>
              {selectedJob.gender_requirement && (
                <Badge variant="outline" className="capitalize">
                  {selectedJob.gender_requirement}
                </Badge>
              )}
              {selectedJob.required_education_levels?.map((el) => (
                <Badge key={el} variant="outline" className="capitalize">
                  {el}
                </Badge>
              ))}
              {selectedJob.provinces?.map((p) => (
                <Badge key={p} variant="outline">
                  {p}
                </Badge>
              ))}
              <Badge variant="outline">
                Deadline: {new Date(selectedJob.last_date).toLocaleDateString()}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {selectedJob && (
        <>
          {/* Message Template Editor */}
          <div className="card-elevated p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground">Message Template</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessageTemplate(DEFAULT_TEMPLATE)}
              >
                Reset to Default
              </Button>
            </div>
            <Textarea
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              rows={12}
              className="font-mono text-xs"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground">Variables:</span>
              {[
                "{name}",
                "{job_title}",
                "{department}",
                "{last_date}",
                "{total_seats}",
                "{age}",
                "{min_age}",
                "{max_age}",
                "{education}",
                "{province}",
                "{gender}",
                "{domicile}",
                "{site_url}",
              ].map((v) => (
                <Badge
                  key={v}
                  variant="secondary"
                  className="text-xs cursor-pointer"
                  onClick={() => {
                    setMessageTemplate((prev) => prev + " " + v);
                  }}
                >
                  {v}
                </Badge>
              ))}
            </div>
            {eligibleUsers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={() => setPreviewUser(eligibleUsers[0])}
              >
                Preview Message
              </Button>
            )}
          </div>

          {/* Eligible Users List */}
          <div className="card-elevated p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Eligible Users ({eligibleUsers.length})
                </h4>
                {noPhoneCount > 0 && (
                  <p className="text-xs text-warning flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {noPhoneCount} user(s) have no phone number
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-8 h-9 w-48"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={openAllWhatsApp}
                  disabled={selectedCount === 0}
                >
                  <Send className="h-4 w-4" />
                  Send to {selectedCount}
                </Button>
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No eligible users found for this job.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="p-2 text-left w-8">
                        <Checkbox
                          checked={selectedUserIds.size === filteredUsers.length}
                          onCheckedChange={toggleAll}
                        />
                      </th>
                      <th className="p-2 text-left font-medium text-muted-foreground">Name</th>
                      <th className="p-2 text-left font-medium text-muted-foreground hidden sm:table-cell">
                        Phone
                      </th>
                      <th className="p-2 text-left font-medium text-muted-foreground hidden md:table-cell">
                        Age
                      </th>
                      <th className="p-2 text-left font-medium text-muted-foreground hidden md:table-cell">
                        Education
                      </th>
                      <th className="p-2 text-left font-medium text-muted-foreground hidden lg:table-cell">
                        Province
                      </th>
                      <th className="p-2 text-center font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="p-2 text-right font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.user_id}
                        className={`border-b border-border last:border-0 ${
                          !user.phone ? "opacity-60" : ""
                        }`}
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={selectedUserIds.has(user.user_id)}
                            onCheckedChange={() => toggleUser(user.user_id)}
                            disabled={!user.phone}
                          />
                        </td>
                        <td className="p-2 font-medium text-foreground">{user.full_name}</td>
                        <td className="p-2 hidden sm:table-cell text-muted-foreground">
                          {user.phone || (
                            <span className="text-destructive text-xs">No phone</span>
                          )}
                        </td>
                        <td className="p-2 hidden md:table-cell text-muted-foreground">
                          {user.age ?? "—"}
                        </td>
                        <td className="p-2 hidden md:table-cell text-muted-foreground capitalize">
                          {user.education_levels.join(", ") || "—"}
                        </td>
                        <td className="p-2 hidden lg:table-cell text-muted-foreground">
                          {user.province || "—"}
                        </td>
                        <td className="p-2 text-center">
                          {sentUsers.has(user.user_id) ? (
                            <Badge className="bg-success text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" /> Sent
                            </Badge>
                          ) : !user.phone ? (
                            <Badge variant="outline" className="text-xs text-destructive">
                              No Phone
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Ready
                            </Badge>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!user.phone}
                              onClick={() => openWhatsApp(user)}
                              title="Send WhatsApp"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyMessage(user)}
                              title="Copy Message"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPreviewUser(user)}
                              title="Preview Message"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Message Preview Dialog */}
      <Dialog open={!!previewUser} onOpenChange={() => setPreviewUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message Preview — {previewUser?.full_name}</DialogTitle>
          </DialogHeader>
          {previewUser && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                {generateMessage(previewUser)}
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    openWhatsApp(previewUser);
                    setPreviewUser(null);
                  }}
                  disabled={!previewUser.phone}
                >
                  <Send className="h-4 w-4" /> Send via WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyMessage(previewUser)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppBulkMessaging;
