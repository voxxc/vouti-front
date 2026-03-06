import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

type UserRole = 'admin' | 'advogado' | 'comercial' | 'financeiro' | 'controller' | 'agenda' | 'reunioes' | 'estagiario' | 'perito';

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

interface AuthProviderProps {
  children: React.ReactNode;
  urlTenantId?: string | null;
}

export const AuthProvider = ({ children, urlTenantId }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  
  // Deduplication refs
  const fetchingRef = useRef(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const initialSessionHandledRef = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip TOKEN_REFRESHED if user hasn't changed — prevents unnecessary re-renders
        if (event === 'TOKEN_REFRESHED') {
          // Only update session reference silently, no state changes that trigger re-renders
          return;
        }

        console.log('[AuthContext] onAuthStateChange event:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          if (event === 'SIGNED_IN') {
            initialSessionHandledRef.current = true;
            fetchUserRoleAndTenant(session.user.id);
          }
        } else {
          setUserRole(null);
          setUserRoles([]);
          setTenantId(null);
          lastFetchedUserIdRef.current = null;
        }
      }
    );

    // THEN check for existing session (only if listener hasn't handled it yet)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialSessionHandledRef.current) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          fetchUserRoleAndTenant(session.user.id);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Optimized: Parallel queries for faster loading
  const fetchUserRoleAndTenant = async (userId: string) => {
    // Deduplicate: skip if already fetching or already fetched for this user
    if (fetchingRef.current || lastFetchedUserIdRef.current === userId) {
      console.log('[AuthContext] Skipping duplicate fetch for user:', userId);
      return;
    }
    fetchingRef.current = true;
    
    try {
      console.log('[AuthContext] Fetching role for user:', userId);
      
      // 1. Fetch super admin and profile in PARALLEL
      const [superAdminRes, profileRes] = await Promise.all([
        supabase
          .from('super_admins')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', userId)
          .single()
      ]);

      const superAdmin = superAdminRes.data;
      const profileData = profileRes.data;
      const profileError = profileRes.error;

      if (superAdmin && urlTenantId) {
        // Super admin acessando tenant via URL - dar acesso completo
        console.log('[AuthContext] Super admin detectado, usando tenant da URL:', urlTenantId);
        setTenantId(urlTenantId);
        setUserRole('admin');
        setUserRoles(['admin']);
        return;
      }
      
      // 2. Set tenant from profile
      if (profileError) {
        console.error('[AuthContext] Error fetching user profile:', profileError);
        setTenantId(null);
      } else {
        setTenantId(profileData?.tenant_id || null);
        console.log('[AuthContext] Tenant ID:', profileData?.tenant_id);
      }
      
      const userTenantId = profileData?.tenant_id;
      
      // 3. Fetch roles (needs tenant_id from previous step)
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
          'advogado': 1,
          'estagiario': 0,
          'perito': -1
        };

        const highestRole = roleData.reduce((prev, current) => {
          const prevPriority = rolePriority[prev.role] || 0;
          const currentPriority = rolePriority[current.role] || 0;
          return currentPriority > prevPriority ? current : prev;
        });

        console.log('[AuthContext] Highest role selected:', highestRole.role);
        setUserRole(highestRole.role as UserRole);
      }
      
      lastFetchedUserIdRef.current = userId;
    } catch (error) {
      console.error('[AuthContext] Critical error in fetchUserRoleAndTenant:', error);
      setUserRole('advogado');
      setTenantId(null);
    } finally {
      fetchingRef.current = false;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
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
