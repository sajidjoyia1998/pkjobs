
-- 1. Gmail on profiles (optional)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gmail TEXT;

-- 2. Team / Careers applications
CREATE TABLE public.team_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position TEXT NOT NULL,
  message TEXT,
  cv_path TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.team_applications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.team_applications TO authenticated;
GRANT ALL ON public.team_applications TO service_role;

ALTER TABLE public.team_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a team application"
  ON public.team_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view team applications"
  ON public.team_applications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update team applications"
  ON public.team_applications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete team applications"
  ON public.team_applications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_team_applications_updated
  BEFORE UPDATE ON public.team_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Storage policies for team-cvs bucket
CREATE POLICY "Anyone can upload a CV to team-cvs"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'team-cvs');

CREATE POLICY "Admins can read team CVs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'team-cvs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete team CVs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'team-cvs' AND public.has_role(auth.uid(), 'admin'));
