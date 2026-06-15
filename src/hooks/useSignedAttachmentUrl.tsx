import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SIGN_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_BEFORE_MS = 5 * 60 * 1000; // refresh 5 min before expiry

/**
 * Resolves the actual viewable URL for a chat attachment.
 *
 * - New uploads are stored as `chatpath:<storage-path>` and we sign a fresh,
 *   short-lived URL (1h) on demand. The URL is auto-refreshed before expiry
 *   while the bubble stays mounted.
 * - Legacy long-lived signed URLs (or any plain http URL) are returned as-is.
 */
export function useSignedAttachmentUrl(stored: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!stored) {
      setUrl(null);
      return;
    }

    if (!stored.startsWith('chatpath:')) {
      // Legacy / external URL — use as-is.
      setUrl(stored);
      return;
    }

    const path = stored.slice('chatpath:'.length);
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const sign = async () => {
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(path, SIGN_TTL_SECONDS);

      if (cancelled) return;
      if (error || !data) {
        setUrl(null);
        return;
      }
      setUrl(data.signedUrl);
      timeoutId = setTimeout(sign, SIGN_TTL_SECONDS * 1000 - REFRESH_BEFORE_MS);
    };

    sign();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [stored]);

  return url;
}
