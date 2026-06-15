
-- 1. Remove permissive chat-attachments upload policy; ownership-enforcing policy remains
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;

-- 2. Restrict notifications INSERT to admins only (triggers use SECURITY DEFINER and bypass RLS)
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Lock down user_roles: split the broad ALL policy into explicit per-command admin policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Remove work_requests from realtime publication; no app code subscribes to it and
--    its row changes were ungated. The 'conversations' table stays published since
--    the existing realtime.messages policy restricts that topic to admins.
ALTER PUBLICATION supabase_realtime DROP TABLE public.work_requests;
