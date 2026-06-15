import { useState, useRef } from 'react';
import { Send, Paperclip, X, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface ChatMessageInputProps {
  onSend: (message: string, attachment?: { url: string; name: string; type: string }) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ChatMessageInput = ({ onSend, disabled, placeholder = "Type a message..." }: ChatMessageInputProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only JPG, PNG, and PDF files are allowed.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB.",
        variant: "destructive",
      });
      return;
    }

    setAttachment(file);
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Bucket is private. Store the storage PATH (not a signed URL) so that
    // viewers always fetch a freshly-signed, short-lived URL at render time.
    // RLS on storage.objects restricts who can actually fetch the file.
    return {
      url: `chatpath:${fileName}`,
      name: file.name,
      type: file.type,
    };
  };

  const handleSend = async () => {
    if (!message.trim() && !attachment) return;

    setUploading(true);
    try {
      let attachmentData: { url: string; name: string; type: string } | undefined;

      if (attachment) {
        attachmentData = await uploadFile(attachment);
      }

      await onSend(message.trim() || (attachment ? `Sent a file: ${attachment.name}` : ''), attachmentData);
      setMessage('');
      setAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Failed to send",
        description: "Could not send your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="p-3 border-t">
      {/* Attachment Preview */}
      {attachment && (
        <div className="mb-2 p-2 bg-muted rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm truncate">
            {getFileIcon(attachment.type)}
            <span className="truncate">{attachment.name}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRemoveAttachment}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex-shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled || uploading}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={(!message.trim() && !attachment) || disabled || uploading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatMessageInput;
