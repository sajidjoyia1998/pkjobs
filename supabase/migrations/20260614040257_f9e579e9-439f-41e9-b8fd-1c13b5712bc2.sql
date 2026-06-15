
-- 1. Protect sensitive columns on applications via trigger
CREATE OR REPLACE FUNCTION public.protect_application_sensitive_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF auth.uid() = OLD.expert_id THEN RETURN NEW; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.payment_amount IS DISTINCT FROM OLD.payment_amount
     OR NEW.payment_date IS DISTINCT FROM OLD.payment_date
     OR NEW.receipt_url IS DISTINCT FROM OLD.receipt_url
     OR NEW.expert_id IS DISTINCT FROM OLD.expert_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.job_id IS DISTINCT FROM OLD.job_id THEN
    RAISE EXCEPTION 'Not allowed to modify protected fields on application';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_application_fields ON public.applications;
CREATE TRIGGER trg_protect_application_fields BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.protect_application_sensitive_fields();

-- 2. Same for work_requests
CREATE OR REPLACE FUNCTION public.protect_work_request_sensitive_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF auth.uid() = OLD.expert_id THEN RETURN NEW; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.payment_amount IS DISTINCT FROM OLD.payment_amount
     OR NEW.payment_date IS DISTINCT FROM OLD.payment_date
     OR NEW.receipt_url IS DISTINCT FROM OLD.receipt_url
     OR NEW.expert_id IS DISTINCT FROM OLD.expert_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not allowed to modify protected fields on work request';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_work_request_fields ON public.work_requests;
CREATE TRIGGER trg_protect_work_request_fields BEFORE UPDATE ON public.work_requests
  FOR EACH ROW EXECUTE FUNCTION public.protect_work_request_sensitive_fields();

-- 3. Messages: only is_read can change for non-admins
CREATE OR REPLACE FUNCTION public.protect_message_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.attachment_url IS DISTINCT FROM OLD.attachment_url
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
    RAISE EXCEPTION 'Only is_read may be updated on messages';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_message_fields ON public.messages;
CREATE TRIGGER trg_protect_message_fields BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.protect_message_fields();

-- 4. team_applications: add user_id, owner SELECT, and tighten INSERT
ALTER TABLE public.team_applications ADD COLUMN IF NOT EXISTS user_id uuid;

DROP POLICY IF EXISTS "Anyone can submit a team application" ON public.team_applications;
CREATE POLICY "Submit team application"
  ON public.team_applications FOR INSERT
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Applicants can view their own team applications"
  ON public.team_applications FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 5. Storage: tighten team-cvs uploads to per-user folder
DROP POLICY IF EXISTS "Anyone can upload a CV to team-cvs" ON storage.objects;
CREATE POLICY "Team CV upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'team-cvs'
    AND (
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
      OR (auth.uid() IS NULL AND (storage.foldername(name))[1] = 'anon')
    )
  );

-- 6. Lock down SECURITY DEFINER functions from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_application_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_work_request_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_eligible_users_on_new_job() FROM PUBLIC, anon, authenticated;
