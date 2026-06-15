import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  pullDistance: number;
  refreshing: boolean;
  threshold: number;
}

const PullToRefreshIndicator = ({ pullDistance, refreshing, threshold }: Props) => {
  if (pullDistance === 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const translate = refreshing ? threshold * 0.6 : pullDistance * 0.6;
  const ready = pullDistance >= threshold;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-50 flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${translate}px)`,
        transition: refreshing ? "transform 200ms ease" : "none",
      }}
      aria-hidden
    >
      <div
        className={cn(
          "mt-2 flex items-center gap-2 rounded-full bg-background/95 backdrop-blur px-3 py-1.5 shadow-md border border-border text-xs text-foreground",
        )}
        style={{ opacity: refreshing ? 1 : Math.max(progress, 0.3) }}
      >
        <RefreshCw
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            refreshing && "animate-spin",
            !refreshing && ready && "text-primary",
          )}
          style={!refreshing ? { transform: `rotate(${progress * 360}deg)` } : undefined}
        />
        <span>
          {refreshing ? "Refreshing..." : ready ? "Release to refresh" : "Pull to refresh"}
        </span>
      </div>
    </div>
  );
};

export default PullToRefreshIndicator;
