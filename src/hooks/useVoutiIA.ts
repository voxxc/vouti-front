import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/hooks/useTenantId';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface ProcessoContext {
  numero_cnj?: string;
  parte_ativa?: string;
  parte_passiva?: string;
  tribunal?: string;
  status?: string;
  valor_causa?: number;
}

export const useVoutiIA = (processoOabId?: string, processoContext?: ProcessoContext) => {
  const { user, userRole } = useAuth();
  const { tenantId } = useTenantId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Load AI settings for tenant
  useEffect(() => {
    const loadSettings = async () => {
      if (!tenantId) {
        setLoadingSettings(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tenant_ai_settings')
          .select('ai_enabled')
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading AI settings:', error);
        }

        setAiEnabled(data?.ai_enabled ?? false);
      } catch (err) {
        console.error('Error loading AI settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettings();
  }, [tenantId]);

  // Load chat history for this process
  useEffect(() => {
    const loadHistory = async () => {
      if (!processoOabId || !tenantId) return;

      try {
        const { data, error } = await supabase
          .from('ai_chat_messages')
          .select('id, role, content, created_at')
          .eq('processo_oab_id', processoOabId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setMessages(data.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            created_at: m.created_at,
          })));
        }
      } catch (err) {
        console.error('Error loading chat history:', err);
      }
    };

    loadHistory();
  }, [processoOabId, tenantId]);

  // Toggle AI enabled for tenant (admin only)
  const toggleAiEnabled = useCallback(async () => {
    if (!tenantId || userRole !== 'admin') {
      toast.error('Apenas administradores podem alterar esta configuracao');
      return;
    }

    try {
      const newValue = !aiEnabled;

      const { error } = await supabase
        .from('tenant_ai_settings')
        .upsert({
          tenant_id: tenantId,
          ai_enabled: newValue,
        }, {
          onConflict: 'tenant_id',
        });

      if (error) throw error;

      setAiEnabled(newValue);
      toast.success(newValue ? 'Vouti IA ativada' : 'Vouti IA desativada');
    } catch (err) {
      console.error('Error toggling AI:', err);
      toast.error('Erro ao alterar configuracao');
    }
  }, [tenantId, userRole, aiEnabled]);

  // Send message to AI
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !aiEnabled || !user || !tenantId) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vouti-ia-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
            processoContext,
            tenantId,
            userId: user.id,
            processoOabId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar solicitacao');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const assistantMessageId = crypto.randomUUID();

      // Add empty assistant message
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              assistantContent += deltaContent;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save assistant message to database
      if (assistantContent && processoOabId) {
        await supabase.from('ai_chat_messages').insert({
          tenant_id: tenantId,
          user_id: user.id,
          processo_oab_id: processoOabId,
          role: 'assistant',
          content: assistantContent,
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
      // Remove the failed user message
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [messages, aiEnabled, user, tenantId, processoOabId, processoContext]);

  // Clear chat history for this process
  const clearHistory = useCallback(async () => {
    if (!processoOabId || !tenantId) return;

    try {
      const { error } = await supabase
        .from('ai_chat_messages')
        .delete()
        .eq('processo_oab_id', processoOabId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setMessages([]);
      toast.success('Historico limpo');
    } catch (err) {
      console.error('Error clearing history:', err);
      toast.error('Erro ao limpar historico');
    }
  }, [processoOabId, tenantId]);

  return {
    messages,
    isLoading,
    aiEnabled,
    loadingSettings,
    isAdmin: userRole === 'admin',
    sendMessage,
    toggleAiEnabled,
    clearHistory,
  };
};
