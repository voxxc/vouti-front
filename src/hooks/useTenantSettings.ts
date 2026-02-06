import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

interface TenantSettings {
  timezone?: string;
  [key: string]: unknown;
}

export const useTenantSettings = () => {
  const { tenant } = useTenant();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant?.settings) {
      setSettings(tenant.settings as TenantSettings);
    }
    setLoading(false);
  }, [tenant]);

  const updateTimezone = async (timezone: string) => {
    if (!tenant?.id) {
      toast.error('Tenant não encontrado');
      return false;
    }

    setSaving(true);
    try {
      const newSettings = {
        ...(settings || {}),
        timezone
      };

      const { error } = await supabase
        .from('tenants')
        .update({ settings: newSettings })
        .eq('id', tenant.id);

      if (error) throw error;

      setSettings(newSettings);
      toast.success('Timezone atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar timezone:', error);
      toast.error('Erro ao atualizar timezone');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    timezone: (settings?.timezone as string) || DEFAULT_TIMEZONE,
    settings,
    updateTimezone,
    loading,
    saving
  };
};
