import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Plus, Briefcase, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import {
  useMyConversations,
  useMessages,
  useSendMessage,
  useChatSubscription,
  useConversationsSubscription,
  useMarkAsRead,
  useGetOrCreateApplicationConversation,
} from '@/hooks/useChat';
import { useMyApplications } from '@/hooks/useApplications';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import ChatMessageInput from './ChatMessageInput';
import ChatMessageBubble from './ChatMessageBubble';
import { supabase } from '@/integrations/supabase/client';

// Event for opening chat with specific application
export const openApplicationChat = (applicationId: string, jobTitle: string) => {
  window.dispatchEvent(new CustomEvent('openApplicationChat', { 
    detail: { applicationId, jobTitle } 
  }));
};

// Event for opening chat from notification (any conversation)
export const openChatWindow = (conversationId?: string) => {
  window.dispatchEvent(new CustomEvent('openChatWindow', { detail: { conversationId } }));
};

const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [vibrate, setVibrate] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: loadingConversations } = useMyConversations();
  const { data: messages = [], isLoading: loadingMessages } = useMessages(selectedConversation);
  const { data: myApplications = [], isLoading: loadingApplications } = useMyApplications();
  const getOrCreateAppConv = useGetOrCreateApplicationConversation();
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  // Real-time subscriptions
  useChatSubscription(selectedConversation);
  useConversationsSubscription();

  // Handle opening chat from application
  const handleApplicationChat = useCallback(async (event: CustomEvent<{ applicationId: string; jobTitle: string }>) => {
    const { applicationId, jobTitle } = event.detail;
    setIsOpen(true);
    
    try {
      const conv = await getOrCreateAppConv.mutateAsync({ applicationId, jobTitle });
      setSelectedConversation(conv.id);
    } catch (error) {
      console.error('Failed to open application chat:', error);
    }
  }, [getOrCreateAppConv]);

  // Listen for application chat events
  useEffect(() => {
    window.addEventListener('openApplicationChat', handleApplicationChat as EventListener);
    return () => {
      window.removeEventListener('openApplicationChat', handleApplicationChat as EventListener);
    };
  }, [handleApplicationChat]);

  // Listen for generic openChatWindow event (e.g. from notification clicks)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ conversationId?: string }>;
      setIsOpen(true);
      if (ce.detail?.conversationId) {
        setSelectedConversation(ce.detail.conversationId);
      }
    };
    window.addEventListener('openChatWindow', handler);
    return () => window.removeEventListener('openChatWindow', handler);
  }, []);

  // Subscribe to new incoming messages globally — open chat & vibrate icon
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`global-messages:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { sender_id: string; conversation_id: string };
          if (msg.sender_id === user.id) return;
          // Auto-open chat window for the new message
          setIsOpen(true);
          setSelectedConversation(msg.conversation_id);
          // Trigger vibration animation
          setVibrate(true);
          window.setTimeout(() => setVibrate(false), 1200);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (selectedConversation) {
      markAsRead.mutate(selectedConversation);
    }
  }, [selectedConversation, messages.length]);

  if (!user) return null;

  const handleSendMessage = async (content: string, attachment?: { url: string; name: string; type: string }) => {
    if (!selectedConversation) return;

    await sendMessage.mutateAsync({
      conversationId: selectedConversation,
      content,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
      attachmentType: attachment?.type,
    });
  };

  const handleCreateConversation = async (applicationId: string, jobTitle: string) => {
    try {
      const conv = await getOrCreateAppConv.mutateAsync({ applicationId, jobTitle });
      setSelectedConversation(conv.id);
      setShowNewChat(false);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          vibrate && "animate-chat-vibrate"
        )}
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[500px] bg-background border rounded-lg shadow-xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <h3 className="font-semibold">
              {selectedConversation ? 'Chat with Admin' : 'Support Chat'}
            </h3>
            {selectedConversation && (
              <button
                onClick={() => setSelectedConversation(null)}
                className="text-sm opacity-80 hover:opacity-100"
              >
                ← Back to conversations
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {!selectedConversation ? (
              // Conversations List
              <div className="h-full flex flex-col">
                <div className="p-2 border-b">
                  <Button
                    onClick={() => setShowNewChat(true)}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Conversation
                  </Button>
                </div>

                {showNewChat && (
                  <div className="p-3 border-b bg-muted/50">
                    <p className="text-sm font-medium mb-2">Select a job application:</p>
                    {loadingApplications ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : myApplications.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        <p>No applications yet.</p>
                        <p className="mt-1">Apply for a job first to start a chat.</p>
                      </div>
                    ) : (
                      <ScrollArea className="max-h-40">
                        <div className="space-y-1">
                          {myApplications.map((app) => (
                            <button
                              key={app.id}
                              onClick={() => handleCreateConversation(app.id, app.job?.title || 'Job Application')}
                              className="w-full p-2 text-left rounded-md hover:bg-muted transition-colors flex items-center justify-between group"
                            >
                              <div>
                                <p className="text-sm font-medium">{app.job?.title}</p>
                                <p className="text-xs text-muted-foreground">{app.job?.department}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowNewChat(false)}
                      className="mt-2"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                <ScrollArea className="flex-1">
                  {loadingConversations ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No conversations yet. Start a new one!
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {conversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConversation(conv.id)}
                          className="w-full p-3 text-left rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-3 w-3 text-primary flex-shrink-0" />
                            <span className="font-medium text-sm truncate">
                              {conv.application?.job?.title || conv.subject || 'Job Application'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(conv.updated_at), 'MMM d, h:mm a')}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              // Messages View
              <div className="h-full flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  {loadingMessages ? (
                    <div className="text-center text-muted-foreground">
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                      No messages yet. Say hello!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <ChatMessageBubble
                          key={msg.id}
                          content={msg.content}
                          timestamp={msg.created_at}
                          isOwn={msg.sender_id === user.id}
                          attachmentUrl={msg.attachment_url}
                          attachmentName={msg.attachment_name}
                          attachmentType={msg.attachment_type}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <ChatMessageInput
                  onSend={handleSendMessage}
                  disabled={sendMessage.isPending}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
