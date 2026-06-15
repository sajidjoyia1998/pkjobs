import { useSeoSettings } from "@/hooks/useSeoSettings";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink } from "lucide-react";

/**
 * Branded cross-promotion card for the separate test preparation website.
 * Configurable by admins via SEO settings.
 */
const TestPrepPromo = ({ className = "" }: { className?: string }) => {
  const { data: settings } = useSeoSettings();
  const url = settings?.test_prep_url?.trim();

  if (!url) return null;

  return (
    <div
      className={`card-elevated p-4 sm:p-5 border-l-4 border-green-600 bg-green-50 dark:bg-green-950/20 overflow-hidden ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-green-600/10 flex items-center justify-center flex-shrink-0">
          <BookOpen className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            Preparing for a written test?
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visit our dedicated Test Prep Hub for PPSC, NTS, FPSC past papers, MCQs, and subject-wise preparation guides.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2 bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
          asChild
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            Start Preparing
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
};

export default TestPrepPromo;
