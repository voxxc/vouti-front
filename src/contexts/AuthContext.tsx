import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

type UserRole = 'admin' | 'advogado' | 'comercial' | 'financeiro' | 'controller' | 'agenda' | 'reunioes';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  userRoles: UserRole[];
  tenantId: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, fullName?: string, tenantId?: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, redirectUrl: string) => Promise<{ error?: any }>;
  updatePassword: (newPassword: string) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Buscar role e tenant do usuário quando autenticado
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoleAndTenant(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setUserRoles([]);
          setTenantId(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchUserRoleAndTenant(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoleAndTenant = async (userId: string) => {
    try {
      console.log('[AuthContext] Fetching role for user:', userId);
      
      // Primeiro buscar o tenant_id do profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('[AuthContext] Error fetching user profile:', profileError);
        setTenantId(null);
      } else {
        setTenantId(profileData?.tenant_id || null);
        console.log('[AuthContext] Tenant ID:', profileData?.tenant_id);
      }
      
      const userTenantId = profileData?.tenant_id;
      
      // Buscar roles filtrando por tenant_id se disponível
      let roleQuery = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (userTenantId) {
        roleQuery = roleQuery.eq('tenant_id', userTenantId);
      }
      
      const { data: roleData, error: roleError } = await roleQuery;

      if (roleError) {
        console.error('[AuthContext] Error fetching user role:', roleError);
        setUserRole('advogado');
        setUserRoles(['advogado']);
      } else if (!roleData || roleData.length === 0) {
        console.warn('[AuthContext] No roles found for user, defaulting to advogado');
        setUserRole('advogado');
        setUserRoles(['advogado']);
      } else {
        console.log('[AuthContext] Roles found:', roleData);
        
        // Guardar TODAS as roles
        const allRoles = roleData.map(r => r.role as UserRole);
        setUserRoles(allRoles);
        console.log('[AuthContext] All roles set:', allRoles);
        
        // Se há múltiplos roles, pegar o de maior privilégio para userRole principal
        const rolePriority: Record<string, number> = {
          'admin': 7,
          'controller': 6,
          'financeiro': 5,
          'comercial': 4,
          'reunioes': 3,
          'agenda': 2,
          'advogado': 1
        };

        const highestRole = roleData.reduce((prev, current) => {
          const prevPriority = rolePriority[prev.role] || 0;
          const currentPriority = rolePriority[current.role] || 0;
          return currentPriority > prevPriority ? current : prev;
        });

        console.log('[AuthContext] Highest role selected:', highestRole.role);
        setUserRole(highestRole.role as UserRole);
      }

      // Tenant já foi buscado no início da função
    } catch (error) {
      console.error('[AuthContext] Critical error in fetchUserRoleAndTenant:', error);
      setUserRole('advogado');
      setTenantId(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    // Pré-carregar dados da Controladoria após login bem-sucedido
    if (!error) {
      // Importar dinamicamente para evitar dependência circular
      import('@/hooks/useControladoriaCache').then(({ prefetchControladoriaData }) => {
        prefetchControladoriaData();
      });
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string, signUpTenantId?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          tenant_id: signUpTenantId
        }
      }
    });

    // Se o signup foi bem sucedido e temos um tenant_id, atualizar o profile
    if (!error && data.user && signUpTenantId) {
      // Aguardar um pouco para o trigger criar o profile
      setTimeout(async () => {
        await supabase
          .from('profiles')
          .update({ tenant_id: signUpTenantId })
          .eq('user_id', data.user!.id);
      }, 1000);
    }

    return { error };
  };

  const signOut = async () => {
    try {
      console.log('[AuthContext] Signing out...');
      
      // Limpar estado local primeiro
      setUser(null);
      setSession(null);
      setUserRole(null);
      setUserRoles([]);
      setTenantId(null);
      
      // Fazer logout no Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[AuthContext] Error signing out:', error);
        throw error;
      }
      
      console.log('[AuthContext] Signed out successfully');
    } catch (error) {
      console.error('[AuthContext] Error in signOut:', error);
      // Mesmo com erro, limpar estado local
      setUser(null);
      setSession(null);
      setUserRole(null);
      setUserRoles([]);
      setTenantId(null);
    }
  };

  const resetPassword = async (email: string, redirectUrl: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userRole,
      userRoles,
      tenantId,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};
