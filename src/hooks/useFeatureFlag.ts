import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type FeatureFlagKey = 'escavador_monitoramento_enabled';

export function useFeatureFlag(key: FeatureFlagKey) {
  const { data, isLoading } = useQuery({
    queryKey: ['feature-flag', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('super_admin_feature_flags')
        .select('enabled')
        .eq('flag_key', key)
        .maybeSingle();
      if (error) throw error;
      return !!data?.enabled;
    },
    staleTime: 60_000,
  });
  return { enabled: !!data, isLoading };
}

export function useAllFeatureFlags() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['feature-flags', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('super_admin_feature_flags')
        .select('flag_key, enabled, description, updated_at')
        .order('flag_key');
      if (error) throw error;
      return data ?? [];
    },
  });

  const setFlag = useMutation({
    mutationFn: async ({ key, enabled }: { key: FeatureFlagKey; enabled: boolean }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('super_admin_feature_flags')
        .update({ enabled, updated_at: new Date().toISOString(), updated_by: userRes.user?.id ?? null })
        .eq('flag_key', key);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['feature-flags', 'all'] });
      qc.invalidateQueries({ queryKey: ['feature-flag', vars.key] });
    },
  });

  return { ...query, setFlag };
}