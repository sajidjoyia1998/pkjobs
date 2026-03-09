CREATE POLICY "Users can delete their own messages within 24 hours"
ON public.messages FOR DELETE
USING (
  auth.uid() = sender_id AND 
  created_at > NOW() - INTERVAL '24 hours'
);