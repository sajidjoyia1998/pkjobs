import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
  CheckCircle2,
  Trash2,
  Loader2,
  ExternalLink,
  Info,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserEducations } from "@/hooks/useEducationFields";
import { useAllEducationLevels } from "@/hooks/useEducationLevels";
import {
  useMyDocuments,
  useUploadUserDocument,
  useDeleteUserDocument,
  getSignedDocumentUrl,
  UserDocument,
} from "@/hooks/useUserDocuments";
import { toast } from "sonner";

interface Slot {
  key: string;
  label: string;
  hint?: string;
}

const FIXED_SLOTS: Slot[] = [
  { key: "cnic_front", label: "CNIC – Front Side", hint: "Clear photo of the front of your CNIC" },
  { key: "cnic_back", label: "CNIC – Back Side", hint: "Clear photo of the back of your CNIC" },
  { key: "passport_photo", label: "Passport Size Photograph", hint: "Recent passport-size photograph" },
];

const MyDocuments = () => {
  const { user } = useAuth();
  const { data: educations = [] } = useUserEducations(user?.id);
  const { data: levels = [] } = useAllEducationLevels();
  const { data: documents = [], isLoading } = useMyDocuments(user?.id);
  const upload = useUploadUserDocument();
  const remove = useDeleteUserDocument();

  const educationSlots: Slot[] = useMemo(() => {
    return educations.map((e) => {
      const levelLabel = levels.find((l) => l.value === e.education_level)?.label || e.education_level;
      const fieldLabel = e.education_field?.display_name;
      return {
        key: `edu_${e.id}`,
        label: fieldLabel ? `${levelLabel} – ${fieldLabel}` : levelLabel,
        hint: "Upload your certificate / degree / DMC",
      };
    });
  }, [educations, levels]);

  const allSlots: Slot[] = [...educationSlots, ...FIXED_SLOTS];

  const docMap = useMemo(() => {
    const m: Record<string, UserDocument> = {};
    documents.forEach((d) => {
      m[d.document_type] = d;
    });
    return m;
  }, [documents]);

  // Documents whose slot is unknown (e.g., an education entry was removed)
  const orphanDocs = documents.filter(
    (d) => !allSlots.some((s) => s.key === d.document_type),
  );

  return (
    <div className="space-y-4">
      <div className="card-elevated p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-1">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground">My Documents</h2>
            <p className="text-sm text-muted-foreground">
              Uploading documents is <span className="font-medium text-foreground">optional</span>.
              We use them to apply for jobs on your behalf, and to print &amp; post when an application requires hard copies.
              We never share your documents with anyone.
            </p>
          </div>
        </div>

        {educationSlots.length === 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-foreground">
              Add your education entries in <span className="font-medium">Profile</span> first &mdash; we&apos;ll then ask for the matching certificates here.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            {allSlots.map((slot) => (
              <DocumentSlot
                key={slot.key}
                slot={slot}
                doc={docMap[slot.key]}
                onUpload={(file) =>
                  user &&
                  upload.mutate({
                    userId: user.id,
                    slotKey: slot.key,
                    file,
                    existingId: docMap[slot.key]?.id,
                    existingPath: docMap[slot.key]?.file_url,
                  })
                }
                onDelete={() => {
                  const d = docMap[slot.key];
                  if (d && user) remove.mutate({ id: d.id, path: d.file_url, userId: user.id });
                }}
                uploading={upload.isPending}
              />
            ))}
          </div>
        )}

        {orphanDocs.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Other uploaded files
            </p>
            <div className="space-y-2">
              {orphanDocs.map((d) => (
                <OrphanRow
                  key={d.id}
                  doc={d}
                  onDelete={() =>
                    user && remove.mutate({ id: d.id, path: d.file_url, userId: user.id })
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DocumentSlot = ({
  slot,
  doc,
  onUpload,
  onDelete,
  uploading,
}: {
  slot: Slot;
  doc?: UserDocument;
  onUpload: (file: File) => void;
  onDelete: () => void;
  uploading: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [opening, setOpening] = useState(false);

  const handleView = async () => {
    if (!doc) return;
    try {
      setOpening(true);
      const url = await getSignedDocumentUrl(doc.file_url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message || "Unable to open file");
    } finally {
      setOpening(false);
    }
  };

  const uploaded = !!doc;

  return (
    <div
      className={`rounded-lg border p-3 sm:p-4 transition-colors ${
        uploaded ? "border-success/40 bg-success/5" : "border-dashed border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm text-foreground truncate">{slot.label}</p>
            {uploaded && (
              <Badge className="bg-success text-success-foreground gap-1 text-[10px]">
                <CheckCircle2 className="h-3 w-3" /> Uploaded
              </Badge>
            )}
          </div>
          {slot.hint && !uploaded && (
            <p className="text-xs text-muted-foreground mt-0.5">{slot.hint}</p>
          )}
          {uploaded && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc!.file_name}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant={uploaded ? "outline" : "default"}
          className="gap-1.5"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-3.5 w-3.5" />
          {uploaded ? "Replace" : "Upload"}
        </Button>
        {uploaded && (
          <>
            <Button size="sm" variant="ghost" className="gap-1.5" onClick={handleView} disabled={opening}>
              {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              View
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const OrphanRow = ({ doc, onDelete }: { doc: UserDocument; onDelete: () => void }) => {
  const [opening, setOpening] = useState(false);
  const open = async () => {
    try {
      setOpening(true);
      const url = await getSignedDocumentUrl(doc.file_url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message || "Unable to open file");
    } finally {
      setOpening(false);
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{doc.file_name}</p>
        <p className="text-xs text-muted-foreground">{doc.document_type}</p>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={open} disabled={opening}>
          {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MyDocuments;
