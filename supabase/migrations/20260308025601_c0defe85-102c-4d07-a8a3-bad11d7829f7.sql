CREATE POLICY "Experts can view profiles of assigned users"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.expert_id = auth.uid()
    AND applications.user_id = profiles.user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.work_requests
    WHERE work_requests.expert_id = auth.uid()
    AND work_requests.user_id = profiles.user_id
  )
);