import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Options {
  onRefresh: () => void | Promise<void>;
  /** Distance in px required to trigger refresh */
  threshold?: number;
  /** Disable on non-mobile */
  mobileOnly?: boolean;
}

/**
 * Attaches pull-to-refresh behavior to the document (window scroll).
 * Returns { pullDistance, refreshing } so the caller can render a visual indicator.
 */
export function usePullToRefresh({ onRefresh, threshold = 70, mobileOnly = true }: Options) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (mobileOnly && !isMobile) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) return;
      startY.current = e.touches[0].clientY;
      pullingRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || startY.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY === 0) {
        // Dampen the pull
        const dampened = Math.min(delta * 0.5, threshold * 1.5);
        setPullDistance(dampened);
      } else if (delta <= 0) {
        setPullDistance(0);
      }
    };

    const onTouchEnd = async () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      startY.current = null;
      if (pullDistance >= threshold && !refreshing) {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setTimeout(() => {
            setRefreshing(false);
            setPullDistance(0);
          }, 300);
        }
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, threshold, mobileOnly, isMobile, pullDistance, refreshing]);

  return { pullDistance, refreshing, threshold };
}
