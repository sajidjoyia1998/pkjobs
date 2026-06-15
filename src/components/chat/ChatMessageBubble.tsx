import { FileText, Image, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useSignedAttachmentUrl } from '@/hooks/useSignedAttachmentUrl';

interface ChatMessageBubbleProps {
  content: string;
  timestamp: string;
  isOwn: boolean;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
}

const ChatMessageBubble = ({
  content,
  timestamp,
  isOwn,
  attachmentUrl,
  attachmentName,
  attachmentType,
}: ChatMessageBubbleProps) => {
  const isImage = attachmentType?.startsWith('image/');
  const isPdf = attachmentType === 'application/pdf';
  const resolvedUrl = useSignedAttachmentUrl(attachmentUrl);

  const handleDownload = () => {
    if (resolvedUrl) {
      window.open(resolvedUrl, '_blank');
    }
  };

  return (
    <div
      className={cn(
        'max-w-[80%] p-3 rounded-lg',
        isOwn
          ? 'ml-auto bg-primary text-primary-foreground'
          : 'bg-muted'
      )}
    >
      {/* Attachment */}
      {attachmentUrl && (
        <div className="mb-2">
          {isImage ? (
            <a href={resolvedUrl ?? undefined} target="_blank" rel="noopener noreferrer">
              {resolvedUrl ? (
                <img
                  src={resolvedUrl}
                  alt={attachmentName || 'Attachment'}
                  className="max-w-full rounded-md max-h-48 object-cover"
                />
              ) : (
                <div className="h-32 w-48 rounded-md bg-muted-foreground/10 animate-pulse" />
              )}
            </a>
          ) : isPdf ? (
            <div 
              className={cn(
                "flex items-center gap-2 p-2 rounded-md cursor-pointer",
                isOwn ? "bg-primary-foreground/10" : "bg-background"
              )}
              onClick={handleDownload}
            >
              <FileText className="h-8 w-8 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachmentName}</p>
                <p className={cn(
                  "text-xs",
                  isOwn ? "opacity-70" : "text-muted-foreground"
                )}>
                  PDF Document
                </p>
              </div>
              <Download className="h-4 w-4 flex-shrink-0" />
            </div>
          ) : (
            <a 
              href={resolvedUrl ?? undefined} 
              target="_blank" 
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 p-2 rounded-md",
                isOwn ? "bg-primary-foreground/10" : "bg-background"
              )}
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm truncate">{attachmentName}</span>
            </a>
          )}
        </div>
      )}
      
      {/* Message Content */}
      {content && !content.startsWith('Sent a file:') && (
        <p className="text-sm">{content}</p>
      )}
      
      {/* Timestamp */}
      <span className="text-xs opacity-70 mt-1 block">
        {format(new Date(timestamp), 'h:mm a')}
      </span>
    </div>
  );
};

export default ChatMessageBubble;
