
-- 1. Remove broad SELECT policy that allows listing seo-assets objects.
-- Public files remain accessible via their public URLs (bucket is public),
-- but clients can no longer enumerate the bucket contents.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (qual ILIKE '%seo-assets%' OR policyname ILIKE '%seo-assets%' OR policyname ILIKE '%seo assets%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Allow only admins to list/inspect seo-assets via the storage API.
CREATE POLICY "Admins can list seo-assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'seo-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Revoke EXECUTE on internal trigger / utility SECURITY DEFINER functions
-- from anon and authenticated. They are only invoked by triggers, not by clients.
REVOKE EXECUTE ON FUNCTION public.notify_on_work_request_update() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_on_application_update() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_message() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_eligible_users_on_new_job() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- has_role() must remain callable by RLS policies; it is SECURITY DEFINER and safe.
-- Keep its execute permissions intact.
