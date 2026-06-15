import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SeoSettings {
  id: string;
  site_title: string | null;
  site_description: string | null;
  default_meta_title: string | null;
  default_meta_description: string | null;
  default_meta_keywords: string | null;
  default_og_image_url: string | null;
  default_og_title: string | null;
  default_og_description: string | null;
  organization_name: string | null;
  website_name: string | null;
  logo_url: string | null;
  website_url: string | null;
  social_facebook: string | null;
  social_twitter: string | null;
  social_linkedin: string | null;
  social_instagram: string | null;
  social_youtube: string | null;
  google_search_console_verification: string | null;
  google_analytics_id: string | null;
  test_prep_banner_html: string | null;
  jobs_ad_html: string | null;
  test_prep_url: string | null;
  created_at: string;
  updated_at: string;
}

export type SeoSettingsUpdate = Partial<Omit<SeoSettings, "id" | "created_at" | "updated_at">>;

export const useSeoSettings = () => {
  return useQuery({
    queryKey: ["seo-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_seo_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data as SeoSettings;
    },
  });
};

export const useUpdateSeoSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: SeoSettingsUpdate }) => {
      const { data, error } = await supabase
        .from("global_seo_settings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
      toast({
        title: "SEO Settings saved",
        description: "Your SEO settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving SEO settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUploadSeoAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, path }: { file: File; path: string }) => {
      const { data, error } = await supabase.storage
        .from("seo-assets")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("seo-assets")
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error uploading file",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
