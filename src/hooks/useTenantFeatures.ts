import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

interface TenantFeatures {
  whatsapp_enabled: boolean;
  whatsapp_lead_source: 'landing_leads' | 'leads_captacao' | null;
}

const DEFAULT_FEATURES: TenantFeatures = {
  whatsapp_enabled: false,
  whatsapp_lead_source: null,
};

export const useTenantFeatures = () => {
  const { tenant } = useTenant();
  const [features, setFeatures] = useState<TenantFeatures>(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant?.settings) {
      const settings = tenant.settings as Record<string, unknown>;
      setFeatures({
        whatsapp_enabled: settings.whatsapp_enabled === true,
        whatsapp_lead_source: (settings.whatsapp_lead_source as TenantFeatures['whatsapp_lead_source']) || null,
      });
    } else {
      setFeatures(DEFAULT_FEATURES);
    }
    setLoading(false);
  }, [tenant]);

  const updateFeature = async <K extends keyof TenantFeatures>(
    key: K, 
    value: TenantFeatures[K]
  ): Promise<boolean> => {
    if (!tenant?.id) return false;

    try {
      const currentSettings = (tenant.settings as Record<string, unknown>) || {};
      const newSettings = { ...currentSettings, [key]: value };

      const { error } = await supabase
        .from('tenants')
        .update({ settings: newSettings as unknown as Record<string, never> })
        .eq('id', tenant.id);

      if (error) throw error;

      setFeatures(prev => ({ ...prev, [key]: value }));
      return true;
    } catch (error) {
      console.error(`Erro ao atualizar feature ${key}:`, error);
      return false;
    }
  };

  return {
    features,
    loading,
    isWhatsAppEnabled: features.whatsapp_enabled,
    whatsappLeadSource: features.whatsapp_lead_source,
    updateFeature,
  };
};
