import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SystemType, Tenant, TenantFormData } from '@/types/superadmin';
import { toast } from '@/hooks/use-toast';

export function useSuperAdmin() {
  const [systemTypes, setSystemTypes] = useState<SystemType[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [noSuperAdminsExist, setNoSuperAdminsExist] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const checkSuperAdmin = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSuperAdmin(false);
        return false;
      }

      setCurrentUserEmail(user.email || null);

      // Check if any super admins exist
      const { count } = await supabase
        .from('super_admins')
        .select('*', { count: 'exact', head: true });

      if (count === 0) {
        // No super admins exist - allow bootstrap
        setNoSuperAdminsExist(true);
        setIsSuperAdmin(false);
        return false;
      }

      setNoSuperAdminsExist(false);

      const { data, error } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking super admin:', error);
        setIsSuperAdmin(false);
        return false;
      }

      const isAdmin = !!data;
      setIsSuperAdmin(isAdmin);
      return isAdmin;
    } catch (error) {
      console.error('Error in checkSuperAdmin:', error);
      setIsSuperAdmin(false);
      return false;
    }
  }, []);

  const becomeSuperAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
        return false;
      }

      const { error } = await supabase
        .from('super_admins')
        .insert({ user_id: user.id, email: user.email || '' });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Você agora é Super Admin!' });
      setIsSuperAdmin(true);
      setNoSuperAdminsExist(false);
      await loadData();
      return true;
    } catch (error) {
      console.error('Error becoming super admin:', error);
      toast({ title: 'Erro', description: 'Não foi possível se tornar Super Admin.', variant: 'destructive' });
      return false;
    }
  };

  const fetchSystemTypes = useCallback(async () => {
    const { data, error } = await supabase
      .from('system_types')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching system types:', error);
      return;
    }

    setSystemTypes(data || []);
  }, []);

  const fetchTenants = useCallback(async () => {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tenants:', error);
      return;
    }

    setTenants(data || []);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSystemTypes(), fetchTenants()]);
    setLoading(false);
  }, [fetchSystemTypes, fetchTenants]);

  const createTenant = async (formData: TenantFormData) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          name: formData.name,
          slug: formData.slug,
          email_domain: formData.email_domain || null,
          system_type_id: formData.system_type_id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cliente criado',
        description: `${formData.name} foi criado com sucesso.`,
      });

      await fetchTenants();
      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao criar cliente',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateTenant = async (id: string, updates: Partial<TenantFormData>) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cliente atualizado',
        description: 'As informações foram atualizadas com sucesso.',
      });

      await fetchTenants();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao atualizar cliente',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const toggleTenantStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: isActive ? 'Cliente ativado' : 'Cliente desativado',
        description: `O status foi alterado com sucesso.`,
      });

      await fetchTenants();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao alterar status',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const getTenantsBySystemType = (systemTypeId: string) => {
    return tenants.filter(t => t.system_type_id === systemTypeId);
  };

  useEffect(() => {
    const init = async () => {
      const isAdmin = await checkSuperAdmin();
      if (isAdmin) {
        await loadData();
      } else {
        setLoading(false);
      }
    };
    init();
  }, [checkSuperAdmin, loadData]);

  return {
    systemTypes,
    tenants,
    loading,
    isSuperAdmin,
    noSuperAdminsExist,
    currentUserEmail,
    createTenant,
    updateTenant,
    toggleTenantStatus,
    getTenantsBySystemType,
    becomeSuperAdmin,
    refetch: loadData,
  };
}
