
REVOKE EXECUTE ON FUNCTION public.protect_application_sensitive_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_work_request_sensitive_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_message_fields() FROM PUBLIC, anon, authenticated;
