
ALTER TABLE public.global_seo_settings
  ADD COLUMN IF NOT EXISTS jobs_ad_html text;

-- Storage RLS for user-documents bucket. Files are organized as <user_id>/<filename>.
CREATE POLICY "Users can read own document files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload own document files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own document files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own document files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can read all document files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
