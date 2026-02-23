import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get the current user's tenant_id.
 * 
 * OPTIMIZED: Now delegates to AuthContext which already fetches tenant_id once.
 * Previously, each of the 97 components using this hook made 2-3 redundant queries
 * (getUser, super_admins, profiles) on every mount. Now they all share a single
 * cached value from AuthContext.
 */
export const useTenantId = (_urlTenantId?: string | null) => {
  const { tenantId, loading } = useAuth();
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
