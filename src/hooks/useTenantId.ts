import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get the current user's tenant_id from their profile
 * For super admins accessing a tenant via URL, returns the URL tenant_id
 * This is used to ensure data isolation between tenants
 */
export const useTenantId = (urlTenantId?: string | null) => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenantId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setTenantId(null);
          setLoading(false);
          return;
        }

        // Verificar se é super admin
        const { data: superAdmin } = await supabase
          .from('super_admins')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (superAdmin && urlTenantId) {
          // Super admin: usar tenant da URL
          console.log('[useTenantId] Super admin usando tenant da URL:', urlTenantId);
          setTenantId(urlTenantId);
          setLoading(false);
          return;
        }

        // Usuário normal: usar tenant do profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();

        setTenantId(profile?.tenant_id || null);
      } catch (error) {
        console.error('[useTenantId] Error fetching tenant_id:', error);
        setTenantId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantId();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchTenantId();
    });

    return () => subscription.unsubscribe();
  }, [urlTenantId]);

  return { tenantId, loading };
};

/**
 * Utility function to get tenant_id for a user (use in hooks that don't need reactive state)
 */
export const getTenantIdForUser = async (userId: string): Promise<string | null> => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', userId)
      .single();

    return data?.tenant_id || null;
  } catch (error) {
    console.error('[getTenantIdForUser] Error:', error);
    return null;
  }
};
