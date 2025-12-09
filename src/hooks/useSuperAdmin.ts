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
  const [noSuperAdminsExist, setNoSuperAdminsExist] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const checkSuperAdmin = useCallback(async () => {
    try {
      // First check if any super admins exist (regardless of auth)
      const { count } = await supabase
        .from('super_admins')
        .select('*', { count: 'exact', head: true });

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (count === 0) {
        // No super admins exist - allow bootstrap
        setNoSuperAdminsExist(true);
        setCurrentUserEmail(currentSession?.user?.email || null);
        setIsSuperAdmin(false);
        return false;
      }

      setNoSuperAdminsExist(false);

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

  // Auth functions
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

  const signUpSuperAdmin = async (email: string, password: string, name: string): Promise<{ error: AuthError | null }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
        emailRedirectTo: `${window.location.origin}/super-admin`,
      },
    });

    if (error) {
      return { error };
    }

    // If signup successful and we have a user, register as super admin
    if (data.user) {
      const { error: insertError } = await supabase
        .from('super_admins')
        .insert({
          user_id: data.user.id,
          email: email,
        });

      if (insertError) {
        console.error('Error registering super admin:', insertError);
      }

      if (data.session) {
        setSession(data.session);
        setCurrentUserEmail(email);
        setIsSuperAdmin(true);
        setNoSuperAdminsExist(false);
      }
    }

    return { error: null };
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
      const { data, error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Nao foi possivel excluir o cliente. Verifique suas permissoes.');
      }

      toast({
        title: 'Cliente excluido',
        description: `${tenantName} foi excluido com sucesso.`,
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
    noSuperAdminsExist,
    currentUserEmail,
    session,
    createTenant,
    updateTenant,
    deleteTenant,
    toggleTenantStatus,
    getTenantsBySystemType,
    becomeSuperAdmin,
    signInSuperAdmin,
    signUpSuperAdmin,
    signOutSuperAdmin,
    refetch: loadData,
  };
}
