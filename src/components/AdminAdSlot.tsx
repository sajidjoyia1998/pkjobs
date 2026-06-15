import { useSeoSettings } from "@/hooks/useSeoSettings";

/**
 * Renders an admin-controlled HTML/CSS advertisement block.
 * Content is sanitized by being entered only by admins via the SEO settings panel.
 */
const AdminAdSlot = ({ slot }: { slot: "jobs" }) => {
  const { data: settings } = useSeoSettings();
  if (!settings) return null;

  let html: string | null | undefined;
  if (slot === "jobs") html = settings.jobs_ad_html;

  const trimmed = html?.trim();
  if (!trimmed) return null;

  return (
    <div
      className="card-elevated p-4 sm:p-5 mb-4 sm:mb-6 border-l-4 border-accent bg-accent/5 overflow-hidden"
      // Admin-controlled HTML/CSS content
      dangerouslySetInnerHTML={{ __html: trimmed }}
    />
  );
};

export default AdminAdSlot;
