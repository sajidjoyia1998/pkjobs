import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACK_KEY = "pakjobs:service_disclaimer_v1";

export const ServiceDisclaimerBanner = ({ onOpenDialog }: { onOpenDialog: () => void }) => (
  <div className="mb-6 rounded-lg border border-info/40 bg-info/10 p-4">
    <div className="flex items-start gap-3">
      <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
      <div className="flex-1 text-sm text-foreground">
        <p className="font-medium mb-0.5">Important: How our service works</p>
        <p className="text-muted-foreground">
          We only process job applications on your behalf for a service fee. We are{" "}
          <span className="font-medium text-foreground">not affiliated</span> with any
          government department or recruitment authority. Your documents are used only for
          applying and are never shared.
        </p>
        <Button variant="link" className="px-0 h-auto text-info" onClick={onOpenDialog}>
          Read full notice
        </Button>
      </div>
    </div>
  </div>
);

export const ServiceDisclaimerDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-warning" />
          Please read before continuing
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              PakJobs is an independent service that helps applicants apply for advertised
              government jobs. We <span className="font-medium text-foreground">charge a service fee</span>{" "}
              for processing your application on your behalf.
            </p>
            <p>
              We are <span className="font-medium text-foreground">not affiliated</span> with FPSC,
              PPSC, any provincial commission, or any government recruitment body. We do not
              guarantee selection, interview calls, or test results.
            </p>
            <p>
              Documents you upload (CNIC, certificates, photographs, etc.) are used solely to
              prepare and submit your application — including printing and posting hard copies
              where required. They are <span className="font-medium text-foreground">not shared</span> with
              third parties.
            </p>
            <p>By using this service you acknowledge and accept the above.</p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogAction
          onClick={() => {
            try {
              localStorage.setItem(ACK_KEY, "1");
            } catch {}
          }}
        >
          I understand
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const useServiceDisclaimer = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(ACK_KEY)) setOpen(true);
    } catch {}
  }, []);
  return { open, setOpen };
};
