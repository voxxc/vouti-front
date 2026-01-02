import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SystemType, Tenant, TenantFormData } from '@/types/superadmin';
import { toast } from '@/hooks/use-toast';
import { Session, AuthError } from '@supabase/supabase-js';

export function useSuperAdmin() {
  const [systemTypes, setSystemTypes] = useState<SystemType[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const checkSuperAdmin = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (!currentSession?.user) {
        setIsSuperAdmin(false);
        setCurrentUserEmail(null);
        return false;
      }

      setCurrentUserEmail(currentSession.user.email || null);

      const { data, error } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', currentSession.user.id)
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

  // Auth functions - APENAS LOGIN, sem cadastro
  const signInSuperAdmin = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.session) {
      setSession(data.session);
      setCurrentUserEmail(data.session.user.email || null);
      
      // Check if user is super admin
      const { data: adminData } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', data.session.user.id)
        .maybeSingle();

      setIsSuperAdmin(!!adminData);
    }

    return { error };
  };

  const signOutSuperAdmin = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsSuperAdmin(false);
    setCurrentUserEmail(null);
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
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        throw new Error('Você precisa estar autenticado para criar um cliente');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-tenant-with-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            slug: formData.slug,
            email_domain: formData.email_domain || null,
            system_type_id: formData.system_type_id,
            admin_email: formData.admin_email,
            admin_password: formData.admin_password,
            admin_name: formData.admin_name,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar cliente');
      }

      toast({
        title: 'Cliente criado com sucesso!',
        description: `${formData.name} foi criado com o administrador ${formData.admin_name} (${formData.admin_email}).`,
      });

      await fetchTenants();
      return result.tenant;
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

  const deleteTenant = async (id: string, tenantName: string) => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        throw new Error('Voce precisa estar autenticado para excluir um cliente');
      }

      const response = await fetch(
        `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/delete-tenant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify({ tenant_id: id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir cliente');
      }

      toast({
        title: 'Cliente excluido permanentemente',
        description: `${tenantName} e todos os ${result.totalDeleted || 0} registros associados foram excluidos.`,
      });

      await fetchTenants();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao excluir cliente',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getTenantsBySystemType = (systemTypeId: string) => {
    return tenants.filter(t => t.system_type_id === systemTypeId);
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setCurrentUserEmail(newSession?.user?.email || null);
        
        // Defer the super admin check to avoid deadlock
        if (newSession) {
          setTimeout(() => {
            checkSuperAdmin();
          }, 0);
        } else {
          setIsSuperAdmin(false);
        }
      }
    );

    // Initial load
    const init = async () => {
      await checkSuperAdmin();
      await loadData();
    };
    init();

    return () => subscription.unsubscribe();
  }, [checkSuperAdmin, loadData]);

  return {
    systemTypes,
    tenants,
    loading,
    isSuperAdmin,
    currentUserEmail,
    session,
    createTenant,
    updateTenant,
    deleteTenant,
    toggleTenantStatus,
    getTenantsBySystemType,
    signInSuperAdmin,
    signOutSuperAdmin,
    refetch: loadData,
  };
}
