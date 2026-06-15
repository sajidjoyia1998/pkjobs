import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, Laptop, Headphones, PenTool, Megaphone, Users, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const POSITIONS = [
  {
    key: "computer-operator",
    title: "Computer Operator",
    type: "On-site / Hybrid",
    icon: Laptop,
    desc: "Process job applications, data entry, scanning & uploading documents for our applicants.",
  },
  {
    key: "remote-computer-operator",
    title: "Remote Computer Operator",
    type: "Remote",
    icon: Laptop,
    desc: "Work from home processing online government job applications on behalf of users.",
  },
  {
    key: "application-expert",
    title: "Application Expert (Govt Jobs)",
    type: "Remote / Hybrid",
    icon: Briefcase,
    desc: "Expert who knows FPSC, PPSC, NTS, KPPSC application processes end-to-end.",
  },
  {
    key: "customer-support",
    title: "Customer Support (Urdu/English)",
    type: "Remote",
    icon: Headphones,
    desc: "Help applicants over WhatsApp & chat — answer queries about jobs and payments.",
  },
  {
    key: "content-writer",
    title: "Content Writer (Jobs & Test Prep)",
    type: "Remote / Freelance",
    icon: PenTool,
    desc: "Write job descriptions, eligibility guides, test preparation articles in Urdu/English.",
  },
  {
    key: "social-media",
    title: "Social Media & WhatsApp Marketer",
    type: "Remote",
    icon: Megaphone,
    desc: "Run our Facebook, TikTok, YouTube Shorts & WhatsApp broadcast lists for new jobs.",
  },
];

const MAX_CV_MB = 5;

const Careers = () => {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    position: "",
    message: "",
  });
  const [cv, setCv] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Join Our Team — Careers at PakJobs";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? null;
    meta?.setAttribute(
      "content",
      "Work with PakJobs. Open roles for computer operators, remote operators, application experts, content writers and social media marketers in Pakistan."
    );
    return () => {
      if (meta && prev !== null) meta.setAttribute("content", prev);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.position) {
      toast.error("Please fill name, email and position.");
      return;
    }
    if (cv && cv.size > MAX_CV_MB * 1024 * 1024) {
      toast.error(`CV too large. Max ${MAX_CV_MB}MB.`);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const folder = user?.id ?? "anon";
      let cv_path: string | null = null;
      if (cv) {
        const safe = cv.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("team-cvs")
          .upload(path, cv, { upsert: false, contentType: cv.type });
        if (upErr) throw upErr;
        cv_path = path;
      }

      const { error } = await supabase.from("team_applications").insert({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        position: form.position,
        message: form.message.trim() || null,
        cv_path,
        user_id: user?.id ?? null,
      });
      if (error) throw error;

      toast.success("Application submitted! We'll be in touch soon.");
      setForm({ full_name: "", email: "", phone: "", position: "", message: "" });
      setCv(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>


      <main className="container py-10 md:py-14">
        <header className="text-center mb-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Users className="h-3.5 w-3.5" /> We're hiring
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Join Our Team</h1>
          <p className="text-muted-foreground">
            Help thousands of Pakistanis apply for government jobs. We're a remote-friendly team
            looking for sharp computer operators, application experts, and creators.
          </p>
        </header>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {POSITIONS.map((p) => {
            const Icon = p.icon;
            return (
              <Card key={p.key} className="hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary">{p.type}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{p.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setForm((f) => ({ ...f, position: p.title }));
                      document
                        .getElementById("apply")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    Apply for this role
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <Card id="apply" className="max-w-2xl mx-auto scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Apply &amp; Upload Your CV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    maxLength={255}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone / WhatsApp</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+92 300 1234567"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Position *</Label>
                  <Select
                    value={form.position}
                    onValueChange={(v) => setForm({ ...form, position: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => (
                        <SelectItem key={p.key} value={p.title}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Why should we hire you?</Label>
                <Textarea
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  maxLength={1000}
                  placeholder="Brief about your experience, availability and skills…"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Upload CV (PDF / DOC, max {MAX_CV_MB}MB)</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setCv(e.target.files?.[0] || null)}
                />
                {cv && (
                  <p className="text-xs text-muted-foreground">Selected: {cv.name}</p>
                )}
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default Careers;
