import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

type UserRole = 'admin' | 'advogado' | 'comercial' | 'financeiro';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Buscar role do usuário quando autenticado
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole('advogado');
        return;
      }

      // Se não há roles, usar default
      if (!data || data.length === 0) {
        setUserRole('advogado');
        return;
      }

      // Se há múltiplos roles, pegar o de maior privilégio
      const rolePriority: Record<string, number> = {
        'admin': 4,
        'financeiro': 3,
        'comercial': 2,
        'advogado': 1
      };

      const highestRole = data.reduce((prev, current) => {
        const prevPriority = rolePriority[prev.role] || 0;
        const currentPriority = rolePriority[current.role] || 0;
        return currentPriority > prevPriority ? current : prev;
      });

      setUserRole(highestRole.role as UserRole);
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setUserRole('advogado');
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    try {
      console.log('[AuthContext] Signing out...');
      
      // Limpar estado local primeiro
      setUser(null);
      setSession(null);
      setUserRole(null);
      
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
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userRole,
      signIn,
      signUp,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};