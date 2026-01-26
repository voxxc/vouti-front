import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Download, FileText, Image as ImageIcon, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MessageAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
}

interface MessageBubbleProps {
  messageId: string;
  content: string;
  isFromCurrentUser: boolean;
  createdAt: string;
  replyToContent?: string;
  onDelete?: () => void;
  onReply?: () => void;
}

export const MessageBubble = ({ 
  messageId, 
  content, 
  isFromCurrentUser, 
  createdAt,
  replyToContent,
  onDelete,
  onReply
}: MessageBubbleProps) => {
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAttachments();
  }, [messageId]);

  const loadAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('message_attachments')
        .select('*')
        .eq('message_id', messageId);

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const downloadAttachment = async (attachment: MessageAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('message-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao baixar arquivo',
        description: 'Não foi possível baixar o arquivo.'
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`max-w-[70%] p-3 rounded-lg ${
          isFromCurrentUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        {/* Reply Preview */}
        {replyToContent && (
          <div 
            className={`mb-2 p-2 rounded text-xs border-l-2 ${
              isFromCurrentUser 
                ? 'bg-primary-foreground/10 border-primary-foreground/50' 
                : 'bg-background/50 border-muted-foreground/50'
            }`}
          >
            <div className={`flex items-center gap-1 mb-1 ${
              isFromCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}>
              <Reply className="h-3 w-3" />
              <span>Respondendo a:</span>
            </div>
            <p className="truncate italic">{replyToContent}</p>
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        
        {attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className={`flex items-center gap-2 p-2 rounded ${
                  isFromCurrentUser ? 'bg-primary-foreground/10' : 'bg-background/50'
                }`}
              >
                {getFileIcon(attachment.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{attachment.file_name}</p>
                  <p className={`text-xs ${
                    isFromCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => downloadAttachment(attachment)}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-1 gap-2">
          <p className={`text-xs ${
            isFromCurrentUser 
              ? 'text-primary-foreground/70' 
              : 'text-muted-foreground'
          }`}>
            {format(new Date(createdAt), "HH:mm", { locale: ptBR })}
          </p>
          
          <div className="flex items-center gap-1">
            {onReply && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onReply}
                title="Responder"
              >
                <Reply className="h-3 w-3" />
              </Button>
            )}
            {isFromCurrentUser && onDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onDelete}
                title="Deletar"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
