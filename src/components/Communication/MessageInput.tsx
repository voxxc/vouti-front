import { useState, useRef } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface MessageInputProps {
  onSend: (message: string, attachments: File[]) => Promise<void>;
  disabled?: boolean;
}

export const MessageInput = ({ onSend, disabled }: MessageInputProps) => {
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && attachments.length === 0) return;

    try {
      await onSend(messageText.trim() || '📎 Arquivo(s) anexado(s)', attachments);
      setMessageText('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar mensagem',
        description: 'Não foi possível enviar a mensagem.'
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024); // 10MB limit
    
    if (validFiles.length !== files.length) {
      toast({
        variant: 'destructive',
        title: 'Arquivos muito grandes',
        description: 'Alguns arquivos excedem o limite de 10MB.'
      });
    }

    setAttachments(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-background px-2 py-1 rounded text-sm"
            >
              <span className="truncate max-w-[150px]">{file.name}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0"
                onClick={() => removeAttachment(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />
        
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Input
          placeholder="Digite sua mensagem..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          className="flex-1"
          disabled={disabled}
        />
        
        <Button 
          type="submit" 
          size="sm" 
          disabled={disabled || (!messageText.trim() && attachments.length === 0)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};