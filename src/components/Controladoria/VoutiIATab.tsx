import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Trash2, Loader2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useVoutiIA } from '@/hooks/useVoutiIA';
import { cn } from '@/lib/utils';

interface ProcessoContext {
  numero_cnj?: string;
  parte_ativa?: string;
  parte_passiva?: string;
  tribunal?: string;
  status?: string;
  valor_causa?: number;
}

interface VoutiIATabProps {
  processoOabId: string;
  processoContext?: ProcessoContext;
}

export const VoutiIATab = ({ processoOabId, processoContext }: VoutiIATabProps) => {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    aiEnabled,
    loadingSettings,
    isAdmin,
    sendMessage,
    toggleAiEnabled,
    clearHistory,
  } = useVoutiIA(processoOabId, processoContext);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !aiEnabled) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-400px)] min-h-[400px]">
      {/* Header with toggle */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-medium">Vouti IA</span>
          {aiEnabled && (
            <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full">
              Ativa
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {messages.length > 0 && aiEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}

          {isAdmin && (
            <div className="flex items-center gap-2">
              <Switch
                id="ai-toggle"
                checked={aiEnabled}
                onCheckedChange={toggleAiEnabled}
              />
              <Label htmlFor="ai-toggle" className="text-sm cursor-pointer">
                <Power className="w-4 h-4" />
              </Label>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      {!aiEnabled ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <Bot className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">Vouti IA Desativada</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {isAdmin
              ? 'Ative a Vouti IA usando o toggle acima para comecar a utilizar o assistente juridico.'
              : 'A Vouti IA esta desativada para este tenant. Entre em contato com o administrador.'}
          </p>
        </div>
      ) : (
        <>
          {/* Messages */}
          <ScrollArea ref={scrollRef} className="flex-1 py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Bot className="w-12 h-12 text-primary/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">Como posso ajudar?</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Pergunte sobre o processo, prazos, estrategias ou qualquer duvida juridica.
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {[
                    'Resuma este processo',
                    'Quais os proximos passos?',
                    'Analise as partes envolvidas',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInputValue(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 px-1">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-4 py-2',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-1 mb-1">
                          <Bot className="w-3 h-3" />
                          <span className="text-xs font-medium">Vouti IA</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Pensando...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="pt-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Digite sua pergunta..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !inputValue.trim()}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};
