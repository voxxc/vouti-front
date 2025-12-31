import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useVoutiIA = (processoOabId?: string) => {
  const { userRole } = useAuth();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryData, setAiSummaryData] = useState<any>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [tenantAiEnabled, setTenantAiEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Carregar dados do processo e configuração do tenant
  useEffect(() => {
    const loadProcessoData = async () => {
      if (!processoOabId) return;

      setIsLoading(true);
      try {
        // Buscar dados do processo
        const { data: processoData, error: processoError } = await supabase
          .from('processos_oab')
          .select('ai_summary, ai_summary_data, ai_enabled, tenant_id')
          .eq('id', processoOabId)
          .single();

        if (processoError) throw processoError;

        setAiSummary(processoData?.ai_summary || null);
        setAiSummaryData(processoData?.ai_summary_data || null);
        setAiEnabled(processoData?.ai_enabled ?? false);

        // Buscar configuração de IA do tenant
        if (processoData?.tenant_id) {
          const { data: tenantSettings } = await supabase
            .from('tenant_ai_settings')
            .select('ai_enabled')
            .eq('tenant_id', processoData.tenant_id)
            .single();

          setTenantAiEnabled(tenantSettings?.ai_enabled ?? false);
        } else {
          setTenantAiEnabled(false);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do processo:', err);
        setTenantAiEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadProcessoData();
  }, [processoOabId]);

  // Ativar IA e gerar resumo
  const enableAndGenerateSummary = useCallback(async () => {
    if (!processoOabId) {
      toast.error('ID do processo não encontrado');
      return false;
    }

    setIsGenerating(true);
    try {
      // Chamar edge function para gerar resumo
      const { data, error } = await supabase.functions.invoke('vouti-gerar-resumo', {
        body: { processo_oab_id: processoOabId },
      });

      if (error) {
        console.error('Erro ao gerar resumo:', error);
        toast.error('Erro ao gerar resumo com IA');
        return false;
      }

      if (data?.error) {
        toast.error(data.error);
        return false;
      }

      // Atualizar estado local
      setAiSummary(data.ai_summary);
      setAiSummaryData(data.ai_summary_data);
      setAiEnabled(true);
      
      toast.success('Vouti IA ativada e resumo gerado com sucesso!');
      return true;
    } catch (err) {
      console.error('Erro ao ativar IA:', err);
      toast.error('Erro ao ativar Vouti IA');
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [processoOabId]);

  // Regenerar resumo (quando já está ativado)
  const regenerateSummary = useCallback(async () => {
    if (!processoOabId) {
      toast.error('ID do processo não encontrado');
      return false;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('vouti-gerar-resumo', {
        body: { processo_oab_id: processoOabId },
      });

      if (error) {
        console.error('Erro ao regenerar resumo:', error);
        toast.error('Erro ao regenerar resumo');
        return false;
      }

      if (data?.error) {
        toast.error(data.error);
        return false;
      }

      setAiSummary(data.ai_summary);
      setAiSummaryData(data.ai_summary_data);
      
      toast.success('Resumo regenerado com sucesso!');
      return true;
    } catch (err) {
      console.error('Erro ao regenerar resumo:', err);
      toast.error('Erro ao regenerar resumo');
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [processoOabId]);

  // Desativar IA para o processo
  const disableAi = useCallback(async () => {
    if (!processoOabId) return false;

    try {
      const { error } = await supabase
        .from('processos_oab')
        .update({ ai_enabled: false })
        .eq('id', processoOabId);

      if (error) throw error;

      setAiEnabled(false);
      toast.success('Vouti IA desativada para este processo');
      return true;
    } catch (err) {
      console.error('Erro ao desativar IA:', err);
      toast.error('Erro ao desativar IA');
      return false;
    }
  }, [processoOabId]);

  return {
    aiSummary,
    aiSummaryData,
    aiEnabled,
    tenantAiEnabled,
    isLoading,
    isGenerating,
    isAdmin: userRole === 'admin',
    enableAndGenerateSummary,
    regenerateSummary,
    disableAi,
  };
};
