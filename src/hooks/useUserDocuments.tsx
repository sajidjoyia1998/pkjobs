import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  file_url: string; // storage path inside the user-documents bucket
  created_at: string;
}

export const useMyDocuments = (userId?: string) => {
  return useQuery({
    queryKey: ["user-documents", userId],
    queryFn: async () => {
      if (!userId) return [] as UserDocument[];
      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as UserDocument[];
    },
    enabled: !!userId,
  });
};

const MAX_FILE_MB = 5;

export const useUploadUserDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      slotKey,
      file,
      existingId,
      existingPath,
    }: {
      userId: string;
      slotKey: string;
      file: File;
      existingId?: string;
      existingPath?: string;
    }) => {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        throw new Error(`File too large. Max ${MAX_FILE_MB}MB.`);
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${slotKey}-${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("user-documents")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      if (existingId) {
        // Replace existing row & delete previous file
        const { error: updErr } = await supabase
          .from("user_documents")
          .update({ file_name: file.name, file_url: path, document_type: slotKey })
          .eq("id", existingId);
        if (updErr) throw updErr;
        if (existingPath) {
          await supabase.storage.from("user-documents").remove([existingPath]);
        }
      } else {
        const { error: insErr } = await supabase.from("user_documents").insert({
          user_id: userId,
          document_type: slotKey,
          file_name: file.name,
          file_url: path,
        });
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["user-documents", vars.userId] });
      toast.success("Document uploaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteUserDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, path, userId }: { id: string; path: string; userId: string }) => {
      const { error } = await supabase.from("user_documents").delete().eq("id", id);
      if (error) throw error;
      if (path) await supabase.storage.from("user-documents").remove([path]);
      return { userId };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["user-documents", res.userId] });
      toast.success("Document removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const getSignedDocumentUrl = async (path: string) => {
  const { data, error } = await supabase.storage
    .from("user-documents")
    .createSignedUrl(path, 60 * 30);
  if (error) throw error;
  return data.signedUrl;
};
