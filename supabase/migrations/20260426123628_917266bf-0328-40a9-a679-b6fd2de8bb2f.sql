-- =========================================================================
-- 1) Lock down chat-attachments storage bucket
-- =========================================================================

-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- Drop existing broad policies for this bucket (names from migration 20260127021542)
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat attachments" ON storage.objects;

-- Helper: a user is a participant in the conversation that owns the message
-- referenced by a chat-attachments storage object. We match by attachment_url
-- containing the object's path (uploads use `${user_id}/<timestamp>.<ext>`).
-- For SELECT we additionally allow the uploader (folder owner) and admins.

-- INSERT: only allow uploads into the user's own folder (auth.uid() prefix)
CREATE POLICY "Chat attachments: users upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- SELECT: uploader, admins, or any participant of a conversation that
-- references this object via messages.attachment_url
CREATE POLICY "Chat attachments: participants and admins can read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.attachment_url LIKE '%' || storage.objects.name
        AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
);

-- DELETE: uploader or admin
CREATE POLICY "Chat attachments: uploader or admin can delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- =========================================================================
-- 2) Lock down Realtime topic subscriptions (realtime.messages)
-- =========================================================================
-- Postgres-changes use a topic naming convention. We restrict who can subscribe
-- to which topic based on the topic name.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read own realtime topics" ON realtime.messages;

CREATE POLICY "Authenticated can read own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Per-user notification channel: notifications:<auth.uid>
  realtime.topic() = 'notifications:' || auth.uid()::text
  -- Per-user global messages channel: global-messages:<auth.uid>
  OR realtime.topic() = 'global-messages:' || auth.uid()::text
  -- Per-conversation channel: messages:<conversation_id> (must be participant or admin)
  OR (
    realtime.topic() LIKE 'messages:%'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = substr(realtime.topic(), length('messages:') + 1)
        AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  -- Global conversations channel: only admins should be allowed to listen broadly
  OR (
    realtime.topic() = 'conversations'
    AND public.has_role(auth.uid(), 'admin')
  )
);
