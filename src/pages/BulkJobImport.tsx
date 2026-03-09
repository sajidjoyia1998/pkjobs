import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Loader2,
  Eye,
  FileQuestion,
  FileUp,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAllEducationLevels } from "@/hooks/useEducationLevels";
import { useEducationFields } from "@/hooks/useEducationFields";
import { useBulkCreateJobs } from "@/hooks/useBulkJobImport";
import { toast } from "@/hooks/use-toast";
import BulkJobPreviewEditor, { type EditableJob } from "@/components/admin/BulkJobPreviewEditor";

const PROVINCE_OPTIONS = [
  { value: "Punjab", label: "Punjab" },
  { value: "Sindh", label: "Sindh" },
  { value: "Khyber Pakhtunkhwa", label: "Khyber Pakhtunkhwa" },
  { value: "Balochistan", label: "Balochistan" },
  { value: "Islamabad", label: "Islamabad" },
  { value: "AJK", label: "AJK" },
  { value: "Gilgit-Baltistan", label: "Gilgit-Baltistan" },
];

const BulkJobImport = () => {
  const navigate = useNavigate();
  const { data: educationLevels = [] } = useAllEducationLevels();
  const { data: educationFields = [] } = useEducationFields();
  const bulkCreateJobs = useBulkCreateJobs();

  const [bulkJobText, setBulkJobText] = useState("");
  const [bulkParseResult, setBulkParseResult] = useState<{
    jobs: EditableJob[];
    errors: string[];
  } | null>(null);
  const [isAIParsing, setIsAIParsing] = useState(false);

  const handleParseBulkJobsAI = async () => {
    if (!bulkJobText.trim()) return;
    setIsAIParsing(true);
    setBulkParseResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("parse-jobs-ai", {
        body: {
          rawText: bulkJobText,
          educationLevels,
          educationFields,
          provinces: PROVINCE_OPTIONS,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setBulkParseResult({ jobs: data.jobs || [], errors: data.errors || [] });

      if ((data.errors || []).length > 0) {
        toast({
          title: `${data.errors.length} issue(s) found`,
          description: "Some jobs could not be parsed. Check the preview for details.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "AI Parsing Failed",
        description: err.message || "Failed to parse jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAIParsing(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkParseResult || bulkParseResult.jobs.length === 0) return;
    try {
      await bulkCreateJobs.mutateAsync(bulkParseResult.jobs);
      navigate("/admin");
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <div className="py-6 sm:py-8">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin")}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <FileUp className="h-6 w-6 sm:h-7 sm:w-7" />
              Add Multiple Jobs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Paste job data in any format — AI will extract all fields. Review and edit before importing.
            </p>
          </div>
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
            Powered by AI
          </Badge>
        </div>

        {/* Sample format guide */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6 border">
          <p className="font-medium text-sm mb-1">How it works</p>
          <p className="text-muted-foreground text-xs mb-2">
            Paste job listings in any format. AI extracts: title, department, description, education levels &amp; fields, age, gender, provinces, domicile, seats, last date, fees, advertisement link &amp; image.
          </p>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2">
                <FileQuestion className="h-3 w-3" />
                Show sample format
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-2 p-3 bg-background border rounded text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap text-muted-foreground max-h-60 overflow-y-auto">
{`Assistant Sub Inspector – Punjab Police
Qualification: Intermediate (Science)
Age: 18-30 | Gender: Male | Seats: 500
Last Date: March 15, 2026
Provinces: Punjab, Sindh | Domicile: Punjab
Bank Challan: Rs. 500 | Post Office: Rs. 200
Photocopy Fee: Rs. 100 | Expert Fee: Rs. 1000
Ad Link: https://punjabpolice.gov.pk/jobs/asi
Ad Image: https://example.com/ad.jpg

Junior Clerk – Ministry of Finance
Qualification: Bachelor (Computer Science, Commerce)
Age: 18-35 | Gender: Any | Seats: 200
Last Date: April 1, 2026
All Pakistan
Bank Challan: Rs. 400 | Expert Fee: Rs. 800`}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Paste area - show when no parse result */}
        {!bulkParseResult && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Paste Job Data</Label>
              <Textarea
                placeholder="Paste any job listing text here — any format works. AI will extract all fields automatically."
                rows={14}
                value={bulkJobText}
                onChange={(e) => setBulkJobText(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleParseBulkJobsAI}
                disabled={!bulkJobText.trim() || isAIParsing}
                className="gap-2"
              >
                {isAIParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI is parsing…
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Parse with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Preview/Edit area - show when parse result available */}
        {bulkParseResult && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBulkParseResult(null)}
              className="text-xs gap-1"
            >
              ← Back to paste
            </Button>
            <BulkJobPreviewEditor
              jobs={bulkParseResult.jobs}
              errors={bulkParseResult.errors}
              educationLevels={educationLevels}
              educationFields={educationFields}
              provinceOptions={PROVINCE_OPTIONS}
              onJobsChange={(updated) =>
                setBulkParseResult((prev) =>
                  prev ? { ...prev, jobs: updated } : null
                )
              }
              onImport={handleBulkImport}
              isImporting={bulkCreateJobs.isPending}
              fullPage
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkJobImport;
