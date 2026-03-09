import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Conversation {
  id: string;
  user_id: string;
  admin_id: string | null;
  subject: string | null;
  status: string;
  application_id: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
  };
  application?: {
    id: string;
    job?: {
      title: string;
      department: string;
    };
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  profiles?: {
    full_name: string;
  };
}

// Get user's conversations
export const useMyConversations = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-conversations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!user,
  });
};

// Get all conversations (for admins)
export const useAllConversations = () => {
  const { isAdmin } = useAuth();
  
  return useQuery({
    queryKey: ['all-conversations'],
    queryFn: async () => {
      // Get conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (convError) throw convError;
      
      // Get unique user IDs
      const userIds = [...new Set(conversations.map(c => c.user_id))];
      
      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Map profiles to conversations
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return conversations.map(conv => ({
        ...conv,
        profiles: profileMap.get(conv.user_id) || { full_name: 'Unknown User' }
      })) as Conversation[];
    },
    enabled: isAdmin,
  });
};

// Get messages for a conversation
export const useMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });
};

// Create a new conversation
export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ subject, applicationId }: { subject?: string; applicationId?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          subject: subject || 'General Inquiry',
          application_id: applicationId || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['all-conversations'] });
    },
  });
};

// Find or create conversation for an application
export const useGetOrCreateApplicationConversation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ applicationId, jobTitle }: { applicationId: string; jobTitle: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if conversation already exists for this application
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('application_id', applicationId)
        .eq('user_id', user.id)
        .single();
      
      if (existing) return existing;
      
      // Create new conversation linked to application
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          subject: `Application: ${jobTitle}`,
          application_id: applicationId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['all-conversations'] });
    },
  });
};

// Send a message
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      content,
      attachmentUrl,
      attachmentName,
      attachmentType,
    }: { 
      conversationId: string; 
      content: string;
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentType?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          attachment_url: attachmentUrl || null,
          attachment_name: attachmentName || null,
          attachment_type: attachmentType || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['all-conversations'] });
    },
  });
};

// Admin start conversation with user
export const useAdminStartConversation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ userId, applicationId, workRequestId, jobTitle }: { userId: string; applicationId?: string; workRequestId?: string; jobTitle: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if conversation already exists for this application or work request
      let query = supabase.from('conversations').select('*');
      if (applicationId) {
        query = query.eq('application_id', applicationId);
      } else if (workRequestId) {
        query = query.eq('work_request_id', workRequestId);
      }
      const { data: existing } = await query.single();
      
      if (existing) return existing;
      
      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          admin_id: user.id,
          subject: applicationId ? `Application: ${jobTitle}` : `Work Request: ${jobTitle}`,
          application_id: applicationId || null,
          work_request_id: workRequestId || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['all-conversations'] });
    },
  });
};

// Mark messages as read
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });
};

// Real-time subscription hook
export const useChatSubscription = (conversationId: string | null) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!conversationId) return;
    
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
};

// Real-time subscription for conversations list
export const useConversationsSubscription = () => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
          queryClient.invalidateQueries({ queryKey: ['all-conversations'] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
