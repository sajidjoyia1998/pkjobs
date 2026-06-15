import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, RefreshCw, AlertTriangle, FileDown } from "lucide-react";
import { toast } from "sonner";

type Row = { id: string; label: string; sub?: string; extra?: string };

interface SectionProps {
  title: string;
  description: string;
  rows: Row[];
  loading: boolean;
  onDelete: (ids: string[]) => Promise<void>;
  onRefresh: () => void;
  onExport?: (ids: string[]) => Promise<void>;
  emptyText?: string;
}

const Section = ({ title, description, rows, loading, onDelete, onRefresh, onExport, emptyText }: SectionProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!onExport || selected.size === 0) return;
    setExporting(true);
    try {
      await onExport(Array.from(selected));
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Permanently delete ${selected.size} item(s) from "${title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete(Array.from(selected));
      toast.success(`${selected.size} item(s) deleted`);
      setSelected(new Set());
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              <Badge variant="secondary">{rows.length}</Badge>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={selected.size === 0 || exporting}
                className="gap-1.5"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Export PDF
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={selected.size === 0 || deleting}
              className="gap-1.5"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete ({selected.size})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyText || "Nothing to clean up here."}</p>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                checked={selected.size === rows.length && rows.length > 0}
                onCheckedChange={toggleAll}
              />
              <span className="text-xs text-muted-foreground">Select all</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y">
              {rows.map((r) => (
                <label key={r.id} className="flex items-start gap-3 py-2 cursor-pointer hover:bg-muted/40 px-1 rounded">
                  <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.label}</p>
                    {r.sub && <p className="text-xs text-muted-foreground truncate">{r.sub}</p>}
                  </div>
                  {r.extra && <span className="text-xs text-muted-foreground shrink-0">{r.extra}</span>}
                </label>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DataCleanup = () => {
  const qc = useQueryClient();
  const [daysOld, setDaysOld] = useState(90);
  const cutoffISO = new Date(Date.now() - daysOld * 86400000).toISOString();
  const todayISO = new Date().toISOString().slice(0, 10);

  // 1. Expired jobs
  const expiredJobs = useQuery({
    queryKey: ["cleanup-expired-jobs", todayISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, department, last_date, is_active")
        .lt("last_date", todayISO)
        .order("last_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Inactive jobs (manually disabled)
  const inactiveJobs = useQuery({
    queryKey: ["cleanup-inactive-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, department, last_date, is_active, updated_at")
        .eq("is_active", false)
        .order("updated_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 3. Completed applications (old)
  const completedApps = useQuery({
    queryKey: ["cleanup-completed-apps", cutoffISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, status, updated_at, receipt_url, job:jobs(title), profile:profiles!applications_user_id_fkey(full_name)")
        .eq("status", "completed")
        .lt("updated_at", cutoffISO)
        .order("updated_at", { ascending: true });
      if (error) {
        // fallback without join
        const { data: d2 } = await supabase
          .from("applications")
          .select("id, status, updated_at, receipt_url")
          .eq("status", "completed")
          .lt("updated_at", cutoffISO);
        return d2 || [];
      }
      return data || [];
    },
  });

  // 4. Completed work requests (old)
  const completedWR = useQuery({
    queryKey: ["cleanup-completed-wr", cutoffISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_requests")
        .select("id, status, updated_at, receipt_url")
        .eq("status", "completed")
        .lt("updated_at", cutoffISO)
        .order("updated_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 5. Inactive users (no applications, no work_requests, created > cutoff)
  const inactiveUsers = useQuery({
    queryKey: ["cleanup-inactive-users", cutoffISO],
    queryFn: async () => {
      const { data: profs, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, phone, created_at")
        .lt("created_at", cutoffISO);
      if (error) throw error;
      if (!profs?.length) return [];
      const ids = profs.map((p) => p.user_id);
      const [{ data: apps }, { data: wrs }, { data: roles }] = await Promise.all([
        supabase.from("applications").select("user_id").in("user_id", ids),
        supabase.from("work_requests").select("user_id").in("user_id", ids),
        supabase.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);
      const active = new Set<string>([
        ...(apps || []).map((a: any) => a.user_id),
        ...(wrs || []).map((w: any) => w.user_id),
      ]);
      const privileged = new Set(
        (roles || [])
          .filter((r: any) => r.role === "admin" || r.role === "expert")
          .map((r: any) => r.user_id)
      );
      return profs.filter((p) => !active.has(p.user_id) && !privileged.has(p.user_id));
    },
  });

  // 6. Old read notifications
  const oldNotifs = useQuery({
    queryKey: ["cleanup-notifs", cutoffISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, type, created_at, is_read")
        .eq("is_read", true)
        .lt("created_at", cutoffISO)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // 7. Old team applications (CV submissions)
  const oldTeamApps = useQuery({
    queryKey: ["cleanup-team-apps", cutoffISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_applications")
        .select("id, full_name, position, email, cv_path, created_at")
        .lt("created_at", cutoffISO)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteFromTable = (table: any) => async (ids: string[]) => {
    const { error } = await supabase.from(table).delete().in("id", ids);
    if (error) throw error;
  };

  const deleteAppsWithReceipts = async (ids: string[]) => {
    const items = (completedApps.data || []).filter((a: any) => ids.includes(a.id));
    const paths = items.map((a: any) => a.receipt_url).filter(Boolean);
    if (paths.length) await supabase.storage.from("user-documents").remove(paths).catch(() => {});
    await deleteFromTable("applications")(ids);
  };

  const deleteWRWithReceipts = async (ids: string[]) => {
    const items = (completedWR.data || []).filter((w: any) => ids.includes(w.id));
    const paths = items.map((w: any) => w.receipt_url).filter(Boolean);
    if (paths.length) await supabase.storage.from("user-documents").remove(paths).catch(() => {});
    await deleteFromTable("work_requests")(ids);
  };

  const deleteTeamAppsWithCVs = async (ids: string[]) => {
    const items = (oldTeamApps.data || []).filter((a: any) => ids.includes(a.id));
    const paths = items.map((a: any) => a.cv_path).filter(Boolean);
    if (paths.length) await supabase.storage.from("team-cvs").remove(paths).catch(() => {});
    await deleteFromTable("team_applications")(ids);
  };

  const refreshAll = () => qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("cleanup-") });

  // ---------- PDF export (print-to-PDF via new window) ----------
  const esc = (v: any) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const fmtDate = (d: any) => (d ? new Date(d).toLocaleString() : "—");

  const printReport = (title: string, bodyHtml: string) => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      toast.error("Pop-up blocked. Allow pop-ups to export.");
      return;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:32px;line-height:1.45}
        h1{font-size:20px;margin:0 0 4px;border-bottom:2px solid #15803d;padding-bottom:6px;color:#15803d}
        h2{font-size:15px;margin:18px 0 6px;color:#15803d;border-bottom:1px solid #d4d4d8;padding-bottom:3px}
        h3{font-size:13px;margin:10px 0 4px}
        .meta{color:#555;font-size:12px;margin-bottom:14px}
        .record{border:1px solid #d4d4d8;border-radius:6px;padding:12px;margin-bottom:18px;page-break-inside:avoid}
        .kv{display:grid;grid-template-columns:160px 1fr;gap:4px 12px;font-size:12px}
        .kv dt{color:#555;font-weight:600}
        .kv dd{margin:0}
        .chat{margin-top:10px;border-top:1px dashed #d4d4d8;padding-top:8px}
        .msg{font-size:12px;margin:4px 0;padding:6px 8px;background:#f4f4f5;border-radius:4px}
        .msg .who{font-weight:600;color:#15803d}
        .msg .ts{color:#777;font-size:10px;margin-left:6px}
        .empty{color:#888;font-style:italic;font-size:12px}
        @media print{ body{margin:14mm} .no-print{display:none} button{display:none} }
        .bar{position:fixed;top:8px;right:8px}
        .bar button{background:#15803d;color:#fff;border:0;padding:8px 14px;border-radius:4px;cursor:pointer;font-size:13px}
      </style></head><body>
      <div class="bar no-print"><button onclick="window.print()">Save as PDF / Print</button></div>
      <h1>${esc(title)}</h1>
      <div class="meta">Generated ${new Date().toLocaleString()} • PakJobs Admin Export</div>
      ${bodyHtml}
      </body></html>`);
    w.document.close();
  };

  const renderChat = async (filter: { application_id?: string; work_request_id?: string; user_id?: string }) => {
    let q = supabase.from("conversations").select("id, subject, created_at, user_id, application_id, work_request_id");
    if (filter.application_id) q = q.eq("application_id", filter.application_id);
    else if (filter.work_request_id) q = q.eq("work_request_id", filter.work_request_id);
    else if (filter.user_id) q = q.eq("user_id", filter.user_id);
    const { data: convs } = await q;
    if (!convs?.length) return '<p class="empty">No chat history.</p>';
    const convIds = convs.map((c) => c.id);
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at, attachment_name")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: true });
    const senderIds = [...new Set((msgs || []).map((m: any) => m.sender_id))];
    const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", senderIds);
    const nameMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
    return convs
      .map((c: any) => {
        const cms = (msgs || []).filter((m: any) => m.conversation_id === c.id);
        return `<h3>Conversation: ${esc(c.subject || "General")}</h3>
          ${cms.length === 0 ? '<p class="empty">No messages.</p>' : cms
            .map(
              (m: any) =>
                `<div class="msg"><span class="who">${esc(nameMap.get(m.sender_id) || "User")}</span><span class="ts">${fmtDate(
                  m.created_at
                )}</span><div>${esc(m.content)}${m.attachment_name ? ` 📎 ${esc(m.attachment_name)}` : ""}</div></div>`
            )
            .join("")}`;
      })
      .join("");
  };

  const exportApplications = async (ids: string[]) => {
    const { data: apps } = await supabase
      .from("applications")
      .select("*, job:jobs(title, department, total_fee, last_date), profile:profiles!applications_user_id_fkey(full_name, phone, email, cnic, province, city)")
      .in("id", ids);
    const sections = await Promise.all(
      (apps || []).map(async (a: any) => {
        const chat = await renderChat({ application_id: a.id });
        return `<div class="record">
          <h2>${esc(a.job?.title || "Application")} — ${esc(a.profile?.full_name || "User")}</h2>
          <dl class="kv">
            <dt>Job</dt><dd>${esc(a.job?.title || "—")} (${esc(a.job?.department || "—")})</dd>
            <dt>Job fee</dt><dd>Rs ${esc(a.job?.total_fee ?? "—")}</dd>
            <dt>Applicant</dt><dd>${esc(a.profile?.full_name || "—")}</dd>
            <dt>Phone</dt><dd>${esc(a.profile?.phone || "—")}</dd>
            <dt>Email</dt><dd>${esc(a.profile?.email || "—")}</dd>
            <dt>CNIC</dt><dd>${esc(a.profile?.cnic || "—")}</dd>
            <dt>Location</dt><dd>${esc(a.profile?.city || "")} ${esc(a.profile?.province || "")}</dd>
            <dt>Status</dt><dd>${esc(a.status)}</dd>
            <dt>Payment</dt><dd>Rs ${esc(a.payment_amount ?? "—")} on ${fmtDate(a.payment_date)}</dd>
            <dt>Receipt</dt><dd>${esc(a.receipt_url || "—")}</dd>
            <dt>Notes</dt><dd>${esc(a.notes || "—")}</dd>
            <dt>Created</dt><dd>${fmtDate(a.created_at)}</dd>
            <dt>Updated</dt><dd>${fmtDate(a.updated_at)}</dd>
          </dl>
          <div class="chat"><h3>Chat History</h3>${chat}</div>
        </div>`;
      })
    );
    printReport(`Applications Archive (${ids.length})`, sections.join(""));
  };

  const exportWorkRequests = async (ids: string[]) => {
    const { data: wrs } = await supabase
      .from("work_requests")
      .select("*, category:service_categories(display_name), profile:profiles!work_requests_user_id_fkey(full_name, phone, email)")
      .in("id", ids);
    const sections = await Promise.all(
      (wrs || []).map(async (w: any) => {
        const chat = await renderChat({ work_request_id: w.id });
        return `<div class="record">
          <h2>${esc(w.category?.display_name || "Work Request")} — ${esc(w.profile?.full_name || "User")}</h2>
          <dl class="kv">
            <dt>Category</dt><dd>${esc(w.category?.display_name || "—")}</dd>
            <dt>User</dt><dd>${esc(w.profile?.full_name || "—")}</dd>
            <dt>Phone</dt><dd>${esc(w.profile?.phone || "—")}</dd>
            <dt>Email</dt><dd>${esc(w.profile?.email || "—")}</dd>
            <dt>Status</dt><dd>${esc(w.status)}</dd>
            <dt>Payment</dt><dd>Rs ${esc(w.payment_amount ?? "—")} on ${fmtDate(w.payment_date)}</dd>
            <dt>Notes</dt><dd>${esc(w.notes || "—")}</dd>
            <dt>Created</dt><dd>${fmtDate(w.created_at)}</dd>
            <dt>Updated</dt><dd>${fmtDate(w.updated_at)}</dd>
          </dl>
          <div class="chat"><h3>Chat History</h3>${chat}</div>
        </div>`;
      })
    );
    printReport(`Work Requests Archive (${ids.length})`, sections.join(""));
  };

  const exportInactiveUsers = async (ids: string[]) => {
    const items = (inactiveUsers.data || []).filter((u: any) => ids.includes(u.id));
    const sections = await Promise.all(
      items.map(async (u: any) => {
        const chat = await renderChat({ user_id: u.user_id });
        return `<div class="record">
          <h2>${esc(u.full_name || "Unnamed")}</h2>
          <dl class="kv">
            <dt>Full name</dt><dd>${esc(u.full_name || "—")}</dd>
            <dt>Phone</dt><dd>${esc(u.phone || "—")}</dd>
            <dt>User ID</dt><dd>${esc(u.user_id)}</dd>
            <dt>Joined</dt><dd>${fmtDate(u.created_at)}</dd>
          </dl>
          <div class="chat"><h3>Chat History</h3>${chat}</div>
        </div>`;
      })
    );
    printReport(`Inactive Users Archive (${ids.length})`, sections.join(""));
  };

  const exportTeamApps = async (ids: string[]) => {
    const items = (oldTeamApps.data || []).filter((t: any) => ids.includes(t.id));
    const html = items
      .map(
        (t: any) => `<div class="record">
          <h2>${esc(t.full_name)} — ${esc(t.position)}</h2>
          <dl class="kv">
            <dt>Email</dt><dd>${esc(t.email)}</dd>
            <dt>Position</dt><dd>${esc(t.position)}</dd>
            <dt>CV path</dt><dd>${esc(t.cv_path || "—")}</dd>
            <dt>Submitted</dt><dd>${fmtDate(t.created_at)}</dd>
          </dl>
        </div>`
      )
      .join("");
    printReport(`Career CV Archive (${ids.length})`, html);
  };


  return (
    <div className="space-y-6">
      <Card className="border-warning/40 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Data Cleanup
          </CardTitle>
          <CardDescription>
            Permanently remove old or unused records. Deletes here cannot be undone — files in storage are removed too.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="days-old">"Old" threshold (days)</Label>
              <Input
                id="days-old"
                type="number"
                min={1}
                value={daysOld}
                onChange={(e) => setDaysOld(Math.max(1, parseInt(e.target.value) || 90))}
                className="w-32"
              />
            </div>
            <Button variant="outline" size="sm" onClick={refreshAll} className="gap-1.5">
              <RefreshCw className="h-4 w-4" /> Refresh all
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Section
          title="Expired Jobs"
          description="Jobs whose last date has passed."
          loading={expiredJobs.isLoading}
          rows={(expiredJobs.data || []).map((j: any) => ({
            id: j.id,
            label: j.title,
            sub: j.department,
            extra: `Expired ${j.last_date}`,
          }))}
          onDelete={deleteFromTable("jobs")}
          onRefresh={() => expiredJobs.refetch()}
        />

        <Section
          title="Inactive Jobs"
          description="Jobs manually disabled (is_active = false)."
          loading={inactiveJobs.isLoading}
          rows={(inactiveJobs.data || []).map((j: any) => ({
            id: j.id,
            label: j.title,
            sub: j.department,
            extra: `Last date ${j.last_date}`,
          }))}
          onDelete={deleteFromTable("jobs")}
          onRefresh={() => inactiveJobs.refetch()}
        />

        <Section
          title={`Completed Applications (>${daysOld}d)`}
          description="Completed job applications older than the threshold. Receipts are removed from storage."
          loading={completedApps.isLoading}
          rows={(completedApps.data || []).map((a: any) => ({
            id: a.id,
            label: a.job?.title || "Application",
            sub: a.profile?.full_name || a.id,
            extra: new Date(a.updated_at).toLocaleDateString(),
          }))}
          onDelete={deleteAppsWithReceipts}
          onExport={exportApplications}
          onRefresh={() => completedApps.refetch()}
        />

        <Section
          title={`Completed Work Requests (>${daysOld}d)`}
          description="Completed custom service requests older than the threshold."
          loading={completedWR.isLoading}
          rows={(completedWR.data || []).map((w: any) => ({
            id: w.id,
            label: `Request ${w.id.slice(0, 8)}`,
            extra: new Date(w.updated_at).toLocaleDateString(),
          }))}
          onDelete={deleteWRWithReceipts}
          onExport={exportWorkRequests}
          onRefresh={() => completedWR.refetch()}
        />

        <Section
          title={`Inactive Users (>${daysOld}d, no activity)`}
          description="Users who never submitted an application or work request. Profiles only — auth accounts are not removed."
          loading={inactiveUsers.isLoading}
          rows={(inactiveUsers.data || []).map((u: any) => ({
            id: u.id,
            label: u.full_name || "Unnamed",
            sub: u.phone || u.user_id,
            extra: new Date(u.created_at).toLocaleDateString(),
          }))}
          onDelete={deleteFromTable("profiles")}
          onExport={exportInactiveUsers}
          onRefresh={() => inactiveUsers.refetch()}
        />

        <Section
          title={`Old Read Notifications (>${daysOld}d)`}
          description="Read notifications older than the threshold."
          loading={oldNotifs.isLoading}
          rows={(oldNotifs.data || []).map((n: any) => ({
            id: n.id,
            label: n.title,
            sub: n.type,
            extra: new Date(n.created_at).toLocaleDateString(),
          }))}
          onDelete={deleteFromTable("notifications")}
          onRefresh={() => oldNotifs.refetch()}
        />

        <Section
          title={`Old Career CVs (>${daysOld}d)`}
          description="Team application submissions and their uploaded CVs."
          loading={oldTeamApps.isLoading}
          rows={(oldTeamApps.data || []).map((t: any) => ({
            id: t.id,
            label: t.full_name,
            sub: `${t.position} • ${t.email}`,
            extra: new Date(t.created_at).toLocaleDateString(),
          }))}
          onDelete={deleteTeamAppsWithCVs}
          onExport={exportTeamApps}
          onRefresh={() => oldTeamApps.refetch()}
        />
      </div>
    </div>
  );
};

export default DataCleanup;
