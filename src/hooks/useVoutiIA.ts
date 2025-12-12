import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/hooks/useTenantId';
import { toast } from 'sonner';

export const useVoutiIA = (processoOabId?: string) => {
  const { user, userRole } = useAuth();
  const { tenantId } = useTenantId();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryData, setAiSummaryData] = useState<any>(null);
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

        setAiEnabled(data?.ai_enabled ?? true);
      } catch (err) {
        console.error('Error loading AI settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettings();
  }, [tenantId]);

  // Load summary from processo
  useEffect(() => {
    const loadSummary = async () => {
      if (!processoOabId) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('processos_oab')
          .select('ai_summary, ai_summary_data')
          .eq('id', processoOabId)
          .single();

        if (error) throw error;

        setAiSummary(data?.ai_summary || null);
        setAiSummaryData(data?.ai_summary_data || null);
      } catch (err) {
        console.error('Error loading summary:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [processoOabId]);

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

  // Refresh summary
  const refreshSummary = useCallback(async () => {
    if (!processoOabId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('processos_oab')
        .select('ai_summary, ai_summary_data')
        .eq('id', processoOabId)
        .single();

      if (error) throw error;

      setAiSummary(data?.ai_summary || null);
      setAiSummaryData(data?.ai_summary_data || null);
    } catch (err) {
      console.error('Error refreshing summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [processoOabId]);

  return {
    aiSummary,
    aiSummaryData,
    isLoading,
    aiEnabled,
    loadingSettings,
    isAdmin: userRole === 'admin',
    toggleAiEnabled,
    refreshSummary,
  };
};
