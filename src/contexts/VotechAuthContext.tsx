import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import type { VotechProfile } from '@/types/votech';

interface VotechAuthContextType {
  user: User | null;
  session: Session | null;
  profile: VotechProfile | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, empresa?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const VotechAuthContext = createContext<VotechAuthContextType | undefined>(undefined);

export const VotechAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<VotechProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            loadUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('votech_profiles' as any)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData as unknown as VotechProfile);

      const { data: roleData } = await supabase
        .from('votech_user_roles' as any)
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!roleData);
    } catch (error) {
      console.error('Error loading votech profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error) {
      toast({
        title: "Bem-vindo ao VoTech!",
        description: "Login realizado com sucesso.",
      });
    }

    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, empresa?: string) => {
    const redirectUrl = `${window.location.origin}/votech/auth`;

    const { count } = await supabase
      .from('votech_profiles' as any)
      .select('*', { count: 'exact', head: true });

    const isFirstUser = count === 0;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          empresa: empresa || null,
        },
      },
    });

    if (!error && data.user) {
      await supabase.from('votech_profiles' as any).insert({
        user_id: data.user.id,
        email,
        full_name: fullName,
        empresa: empresa || null,
      });

      if (isFirstUser) {
        await supabase.from('votech_user_roles' as any).insert({
          user_id: data.user.id,
          role: 'admin',
        });
      }

      toast({
        title: "Conta criada!",
        description: isFirstUser
          ? "Bem-vindo ao VoTech! Você é o administrador."
          : "Bem-vindo ao VoTech.",
      });
    }

    return { error };
  };

  const signOut = async () => {
    setProfile(null);
    setIsAdmin(false);
    setUser(null);
    setSession(null);

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.log('Logout completed (session may have been expired)');
    } finally {
      navigate('/votech/auth');
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    }
  };

  const value = {
    user, session, profile, isAdmin, signIn, signUp, signOut, loading,
  };

  return (
    <VotechAuthContext.Provider value={value}>
      {children}
    </VotechAuthContext.Provider>
  );
};

export const useVotechAuth = () => {
  const context = useContext(VotechAuthContext);
  if (context === undefined) {
    throw new Error('useVotechAuth must be used within a VotechAuthProvider');
  }
  return context;
};
