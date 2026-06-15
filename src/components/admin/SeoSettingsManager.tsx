import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, Globe, Search, BarChart3, Share2, Building2, BookOpen } from "lucide-react";
import { useSeoSettings, useUpdateSeoSettings, useUploadSeoAsset, SeoSettingsUpdate } from "@/hooks/useSeoSettings";
import TestPrepPromo from "@/components/TestPrepPromo";

const SeoSettingsManager = () => {
  const { data: settings, isLoading } = useSeoSettings();
  const updateSettings = useUpdateSeoSettings();
  const uploadAsset = useUploadSeoAsset();

  const [formData, setFormData] = useState<SeoSettingsUpdate>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        site_title: settings.site_title,
        site_description: settings.site_description,
        default_meta_title: settings.default_meta_title,
        default_meta_description: settings.default_meta_description,
        default_meta_keywords: settings.default_meta_keywords,
        default_og_image_url: settings.default_og_image_url,
        default_og_title: settings.default_og_title,
        default_og_description: settings.default_og_description,
        organization_name: settings.organization_name,
        website_name: settings.website_name,
        logo_url: settings.logo_url,
        website_url: settings.website_url,
        social_facebook: settings.social_facebook,
        social_twitter: settings.social_twitter,
        social_linkedin: settings.social_linkedin,
        social_instagram: settings.social_instagram,
        social_youtube: settings.social_youtube,
        google_search_console_verification: settings.google_search_console_verification,
        google_analytics_id: settings.google_analytics_id,
        test_prep_banner_html: settings.test_prep_banner_html,
        jobs_ad_html: settings.jobs_ad_html,
        test_prep_url: settings.test_prep_url,
      });
    }
  }, [settings]);

  const handleChange = (field: keyof SeoSettingsUpdate, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value || null }));
    setHasChanges(true);
  };

  const handleFileUpload = async (file: File, field: "default_og_image_url" | "logo_url") => {
    const timestamp = Date.now();
    const path = `${field}/${timestamp}-${file.name}`;
    
    try {
      const url = await uploadAsset.mutateAsync({ file, path });
      handleChange(field, url);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleSave = async () => {
    if (!settings?.id) return;
    
    await updateSettings.mutateAsync({
      id: settings.id,
      updates: formData,
    });
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Button */}
      <div className="flex justify-end sticky top-0 bg-background z-10 py-2">
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || updateSettings.isPending}
          className="gap-2"
        >
          {updateSettings.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      {/* Basic SEO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Basic Site Information
          </CardTitle>
          <CardDescription>
            Configure the main site title and description used across the website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Site Title</Label>
              <Input
                placeholder="My Website"
                value={formData.site_title || ""}
                onChange={(e) => handleChange("site_title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Website Name</Label>
              <Input
                placeholder="My Website"
                value={formData.website_name || ""}
                onChange={(e) => handleChange("website_name", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Site Description</Label>
            <Textarea
              placeholder="A brief description of your website..."
              value={formData.site_description || ""}
              onChange={(e) => handleChange("site_description", e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Website URL</Label>
            <Input
              placeholder="https://example.com"
              value={formData.website_url || ""}
              onChange={(e) => handleChange("website_url", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Preparation Banner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Test Preparation Banner
          </CardTitle>
          <CardDescription>
            Shown on every job page where "Test Preparation Available" is enabled. Supports HTML & inline CSS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Banner HTML / CSS</Label>
            <Textarea
              placeholder={`<div style="font-weight:600">📚 Test prep available! <a href="/contact" style="color:#16a34a;text-decoration:underline">Enroll now</a></div>`}
              value={formData.test_prep_banner_html || ""}
              onChange={(e) => handleChange("test_prep_banner_html" as any, e.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              You can include HTML tags and inline <code>style=&quot;...&quot;</code> attributes.
            </p>
          </div>
          {formData.test_prep_banner_html && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div
                className="p-4 rounded-lg border-l-4 border-primary bg-primary/5"
                dangerouslySetInnerHTML={{ __html: formData.test_prep_banner_html }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jobs Page Advertisement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Jobs Page Advertisement
          </CardTitle>
          <CardDescription>
            Shown at the top of the Jobs listing page. Supports HTML &amp; inline CSS. Leave empty to hide.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Ad HTML / CSS</Label>
            <Textarea
              placeholder={`<div style="display:flex;gap:12px;align-items:center"><strong>📘 Free PPSC test prep guide</strong> <a href="/contact" style="color:#16a34a;text-decoration:underline">Get it now</a></div>`}
              value={formData.jobs_ad_html || ""}
              onChange={(e) => handleChange("jobs_ad_html" as any, e.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              You can include HTML tags and inline <code>style=&quot;...&quot;</code> attributes.
            </p>
          </div>
          {formData.jobs_ad_html && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div
                className="p-4 rounded-lg border-l-4 border-accent bg-accent/5"
                dangerouslySetInnerHTML={{ __html: formData.jobs_ad_html }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Prep Cross-Promotion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Test Preparation Cross-Promotion
          </CardTitle>
          <CardDescription>
            Link to your separate test preparation website. Shown as a branded banner on the Jobs and Dashboard pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Test Prep Website URL</Label>
            <Input
              placeholder="https://testprep.example.com"
              value={formData.test_prep_url || ""}
              onChange={(e) => handleChange("test_prep_url" as any, e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to hide the banner. Must start with https://
            </p>
          </div>
          {formData.test_prep_url && (
            <div className="space-y-2">
              <Label>Live Preview</Label>
              <TestPrepPromo />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Default Meta Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Default Meta Tags
          </CardTitle>
          <CardDescription>
            These values are used when page-level SEO is not defined
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Meta Title</Label>
            <Input
              placeholder="Page Title | Site Name"
              value={formData.default_meta_title || ""}
              onChange={(e) => handleChange("default_meta_title", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Recommended: 50-60 characters</p>
          </div>
          <div className="space-y-2">
            <Label>Default Meta Description</Label>
            <Textarea
              placeholder="A compelling description for search engines..."
              value={formData.default_meta_description || ""}
              onChange={(e) => handleChange("default_meta_description", e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Recommended: 150-160 characters</p>
          </div>
          <div className="space-y-2">
            <Label>Default Meta Keywords (Optional)</Label>
            <Input
              placeholder="keyword1, keyword2, keyword3"
              value={formData.default_meta_keywords || ""}
              onChange={(e) => handleChange("default_meta_keywords", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Open Graph */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Open Graph (Social Sharing)
          </CardTitle>
          <CardDescription>
            Configure how your site appears when shared on social media
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default OG Title</Label>
            <Input
              placeholder="Title for social sharing"
              value={formData.default_og_title || ""}
              onChange={(e) => handleChange("default_og_title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Default OG Description</Label>
            <Textarea
              placeholder="Description for social sharing..."
              value={formData.default_og_description || ""}
              onChange={(e) => handleChange("default_og_description", e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Default OG Image</Label>
            <div className="flex items-center gap-4">
              {formData.default_og_image_url && (
                <img 
                  src={formData.default_og_image_url} 
                  alt="OG Preview" 
                  className="h-20 w-auto rounded border"
                />
              )}
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "default_og_image_url");
                  }}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">Recommended: 1200x630 pixels</p>
              </div>
            </div>
            {formData.default_og_image_url && (
              <Input
                placeholder="Or enter image URL directly"
                value={formData.default_og_image_url || ""}
                onChange={(e) => handleChange("default_og_image_url", e.target.value)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Organization Schema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization / Website Schema
          </CardTitle>
          <CardDescription>
            Structured data for search engines (JSON-LD)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input
                placeholder="My Company Inc."
                value={formData.organization_name || ""}
                onChange={(e) => handleChange("organization_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-2">
                {formData.logo_url && (
                  <img 
                    src={formData.logo_url} 
                    alt="Logo Preview" 
                    className="h-10 w-auto rounded border"
                  />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "logo_url");
                  }}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-base font-medium">Social Profile Links</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Add your social media profile URLs for schema markup
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Facebook</Label>
                <Input
                  placeholder="https://facebook.com/yourpage"
                  value={formData.social_facebook || ""}
                  onChange={(e) => handleChange("social_facebook", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Twitter / X</Label>
                <Input
                  placeholder="https://twitter.com/yourhandle"
                  value={formData.social_twitter || ""}
                  onChange={(e) => handleChange("social_twitter", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">LinkedIn</Label>
                <Input
                  placeholder="https://linkedin.com/company/yourcompany"
                  value={formData.social_linkedin || ""}
                  onChange={(e) => handleChange("social_linkedin", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Instagram</Label>
                <Input
                  placeholder="https://instagram.com/yourhandle"
                  value={formData.social_instagram || ""}
                  onChange={(e) => handleChange("social_instagram", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">YouTube</Label>
                <Input
                  placeholder="https://youtube.com/@yourchannel"
                  value={formData.social_youtube || ""}
                  onChange={(e) => handleChange("social_youtube", e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification & Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Verification & Analytics
          </CardTitle>
          <CardDescription>
            Connect your site to Google Search Console and Analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Google Search Console Verification</Label>
            <Input
              placeholder="google-site-verification=xxxxx"
              value={formData.google_search_console_verification || ""}
              onChange={(e) => handleChange("google_search_console_verification", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste the full meta tag content attribute value
            </p>
          </div>
          <div className="space-y-2">
            <Label>Google Analytics / GA4 Measurement ID</Label>
            <Input
              placeholder="G-XXXXXXXXXX"
              value={formData.google_analytics_id || ""}
              onChange={(e) => handleChange("google_analytics_id", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your GA4 measurement ID (starts with G-)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SeoSettingsManager;
