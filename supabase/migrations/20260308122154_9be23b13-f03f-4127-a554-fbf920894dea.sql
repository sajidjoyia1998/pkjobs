-- Allow experts to view documents of users assigned to them
CREATE POLICY "Experts can view documents of assigned users"
ON public.user_documents
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM applications
    WHERE applications.expert_id = auth.uid()
    AND applications.user_id = user_documents.user_id
  ))
  OR
  (EXISTS (
    SELECT 1 FROM work_requests
    WHERE work_requests.expert_id = auth.uid()
    AND work_requests.user_id = user_documents.user_id
  ))
);