-- Add test prep flag to jobs
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS test_preparation_available boolean NOT NULL DEFAULT false;

-- Add global test prep banner content to SEO settings table (reused as global settings)
ALTER TABLE public.global_seo_settings
ADD COLUMN IF NOT EXISTS test_prep_banner_html text;