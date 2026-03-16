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
 * Usa refs para callbacks — evita recriar subscription a cada render
 */
export const useWhatsAppSync = ({
  onConversationUpdate,
  onMessageUpdate,
  onCommanderActivity,
  agentId,
  enabled = true
}: UseWhatsAppSyncOptions) => {
  const { tenantId } = useTenantId();
  const lastSignalTime = useRef<number>(0);
  
  // Refs para callbacks — evita dependências instáveis no useEffect
  const onConversationUpdateRef = useRef(onConversationUpdate);
  const onMessageUpdateRef = useRef(onMessageUpdate);
  const onCommanderActivityRef = useRef(onCommanderActivity);
  
  // Sincronizar refs com props atuais (sem deps = roda a cada render)
  useEffect(() => {
    onConversationUpdateRef.current = onConversationUpdate;
    onMessageUpdateRef.current = onMessageUpdate;
    onCommanderActivityRef.current = onCommanderActivity;
  });

  // Realtime signal listener
  useEffect(() => {
    if (!enabled || !tenantId) return;

    console.log('🔄 WhatsApp Sync: Starting signal listener for tenant:', tenantId);

    const channelName = `whatsapp-sync-${tenantId}`;
    
    const channel = supabase
      .channel(channelName)
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
          
          if (signalTime <= lastSignalTime.current) {
            console.log('🔄 WhatsApp Sync: Ignoring old/duplicate signal');
            return;
          }
          lastSignalTime.current = signalTime;

          console.log('🔄 WhatsApp Sync: Signal received:', signal.signal_type, 'for phone:', signal.phone?.slice(-4));

          switch (signal.signal_type) {
            case 'message_received':
              onConversationUpdateRef.current?.();
              onMessageUpdateRef.current?.(signal.phone);
              break;
            case 'message_sent':
              onConversationUpdateRef.current?.();
              onMessageUpdateRef.current?.(signal.phone);
              break;
            case 'commander_message':
              onConversationUpdateRef.current?.();
              onMessageUpdateRef.current?.(signal.phone);
              onCommanderActivityRef.current?.(signal.phone);
              break;
            default:
              console.log('🔄 WhatsApp Sync: Unknown signal type:', signal.signal_type);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔄 WhatsApp Sync: Subscription status:', status);
      });

    return () => {
      console.log('🔄 WhatsApp Sync: Cleaning up signal listener');
      supabase.removeChannel(channel);
    };
  }, [tenantId, enabled]);

  // Polling fallback (30s) — safety net for missed signals
  useEffect(() => {
    if (!enabled || !tenantId) return;

    const interval = setInterval(() => {
      console.log('🔄 WhatsApp Sync: Fallback polling tick');
      onConversationUpdateRef.current?.();
      onMessageUpdateRef.current?.("");
    }, 30000);

    return () => clearInterval(interval);
  }, [tenantId, enabled]);

  return {
    isListening: enabled && !!tenantId
  };
};
