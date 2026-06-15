import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  /** Query keys to invalidate. If omitted, invalidates all queries. */
  queryKeys?: (string | readonly unknown[])[];
  className?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
}

const RefreshButton = ({
  queryKeys,
  className,
  label,
  variant = "outline",
  size = "sm",
}: RefreshButtonProps) => {
  const qc = useQueryClient();
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = async () => {
    setSpinning(true);
    try {
      if (queryKeys && queryKeys.length) {
        await Promise.all(
          queryKeys.map((k) =>
            qc.invalidateQueries({
              queryKey: Array.isArray(k) ? (k as unknown[]) : [k as string],
            })
          )
        );
      } else {
        await qc.invalidateQueries();
      }
      toast.success("Updated to latest");
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setTimeout(() => setSpinning(false), 500);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
      className={cn("gap-2", className)}
      aria-label="Refresh"
    >
      <RefreshCw className={cn("h-4 w-4", spinning && "animate-spin")} />
      {label && <span>{label}</span>}
    </Button>
  );
};

export default RefreshButton;
