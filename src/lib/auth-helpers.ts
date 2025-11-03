import { supabase } from '@/integrations/supabase/client';

/**
 * Verifica se o usuário atual possui role 'admin'
 */
export const checkIfUserIsAdmin = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  
  return !!data;
};

/**
 * Verifica se o usuário possui role 'admin' ou 'controller'
 */
export const checkIfUserIsAdminOrController = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['admin', 'controller'])
    .maybeSingle();
  
  return !!data;
};
