import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseWhatsAppAIControlProps {
  phoneNumber: string;
  tenantId: string | null;
}

interface AIControlState {
  isAIDisabled: boolean;
  isLoading: boolean;
  disabledAt: string | null;
  disabledBy: string | null;
}

export const useWhatsAppAIControl = ({ phoneNumber, tenantId }: UseWhatsAppAIControlProps) => {
  const { toast } = useToast();
  const [state, setState] = useState<AIControlState>({
    isAIDisabled: false,
    isLoading: true,
    disabledAt: null,
    disabledBy: null,
  });

  // Buscar status atual
  const fetchStatus = async () => {
    if (!phoneNumber) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      let query = supabase
        .from('whatsapp_ai_disabled_contacts')
        .select('id, disabled_at, disabled_by')
        .eq('phone_number', phoneNumber);
      
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      } else {
        query = query.is('tenant_id', null);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) throw error;
      
      setState({
        isAIDisabled: !!data,
        isLoading: false,
        disabledAt: data?.disabled_at || null,
        disabledBy: data?.disabled_by || null,
      });
    } catch (error) {
      console.error('Erro ao buscar status da IA:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Desabilitar IA (humano assume)
  const disableAI = async (reason?: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('whatsapp_ai_disabled_contacts')
        .insert({
          phone_number: phoneNumber,
          tenant_id: tenantId,
          disabled_by: user?.id,
          reason: reason || 'Atendimento humano iniciado',
        });
      
      if (error) throw error;
      
      setState({
        isAIDisabled: true,
        isLoading: false,
        disabledAt: new Date().toISOString(),
        disabledBy: user?.id || null,
      });
      
      toast({
        title: "Atendimento assumido",
        description: "O Agente IA foi desabilitado para este contato.",
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao desabilitar IA:', error);
      toast({
        title: "Erro",
        description: "Não foi possível assumir o atendimento.",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  // Reativar IA
  const enableAI = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      let query = supabase
        .from('whatsapp_ai_disabled_contacts')
        .delete()
        .eq('phone_number', phoneNumber);
      
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      } else {
        query = query.is('tenant_id', null);
      }
      
      const { error } = await query;
      
      if (error) throw error;
      
      setState({
        isAIDisabled: false,
        isLoading: false,
        disabledAt: null,
        disabledBy: null,
      });
      
      toast({
        title: "Agente IA reativado",
        description: "A IA voltará a responder este contato automaticamente.",
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao reativar IA:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reativar o Agente IA.",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [phoneNumber, tenantId]);

  return {
    ...state,
    disableAI,
    enableAI,
    refetch: fetchStatus,
  };
};
