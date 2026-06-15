import { useSeoSettings } from "@/hooks/useSeoSettings";

interface TestPrepBannerProps {
  enabled: boolean;
}

const TestPrepBanner = ({ enabled }: TestPrepBannerProps) => {
  const { data: settings } = useSeoSettings();

  if (!enabled) return null;
  const html = settings?.test_prep_banner_html?.trim();
  if (!html) return null;

  return (
    <div
      className="card-elevated p-4 sm:p-6 border-l-4 border-primary bg-primary/5"
      // Admin-controlled HTML/CSS content
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default TestPrepBanner;
