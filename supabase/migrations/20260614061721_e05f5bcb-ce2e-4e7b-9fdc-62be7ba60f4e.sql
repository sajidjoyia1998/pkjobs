ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_application_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_work_request_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_work_request_id_fkey FOREIGN KEY (work_request_id) REFERENCES public.work_requests(id) ON DELETE CASCADE;