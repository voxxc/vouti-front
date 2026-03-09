import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';

interface SyncSignal {
  id: string;
  tenant_id: string | null;
  signal_type: string;
  phone: string;
  agent_id: string | null;
  created_at: string;
}

interface UseWhatsAppSyncOptions {
  onConversationUpdate?: () => void;
  onMessageUpdate?: (phone: string) => void;
  onCommanderActivity?: (phone: string) => void;
  agentId?: string | null;
  enabled?: boolean;
}

/**
 * Hook para escutar sinais de sincronização do WhatsApp
 * Substitui o Realtime direto nas mensagens para maior confiabilidade
 */
export const useWhatsAppSync = ({
  onConversationUpdate,
  onMessageUpdate,
  onCommanderActivity,
  agentId,
  enabled = true
}: UseWhatsAppSyncOptions) => {
  const { tenantId } = useTenantId();
  const lastSignalTime = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled || !tenantId) return;

    console.log('🔄 WhatsApp Sync: Starting signal listener for tenant:', tenantId);

    const channel = supabase
      .channel('whatsapp-sync-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_sync_signals',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          const signal = payload.new as SyncSignal;
          const signalTime = new Date(signal.created_at).getTime();
          
          // Evitar processar sinais duplicados/antigos
          if (signalTime <= lastSignalTime.current) {
            console.log('🔄 WhatsApp Sync: Ignoring old/duplicate signal');
            return;
          }
          lastSignalTime.current = signalTime;

          console.log('🔄 WhatsApp Sync: Signal received:', signal.signal_type, 'for phone:', signal.phone?.slice(-4));

          switch (signal.signal_type) {
            case 'message_received':
              // Nova mensagem recebida - atualizar conversas e mensagens
              onConversationUpdate?.();
              onMessageUpdate?.(signal.phone);
              break;
              
            case 'message_sent':
              // Mensagem enviada (outgoing) - atualizar apenas mensagens 
              onMessageUpdate?.(signal.phone);
              break;
              
            case 'commander_message':
              // Atividade do Commander - atualizar conversas e notificar
              onConversationUpdate?.();
              onMessageUpdate?.(signal.phone);
              onCommanderActivity?.(signal.phone);
              break;
              
            default:
              console.log('🔄 WhatsApp Sync: Unknown signal type:', signal.signal_type);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 WhatsApp Sync: Cleaning up signal listener');
      supabase.removeChannel(channel);
    };
  }, [tenantId, enabled, onConversationUpdate, onMessageUpdate, onCommanderActivity, agentId]);

  return {
    // Pode retornar status/métodos se necessário no futuro
    isListening: enabled && !!tenantId
  };
};