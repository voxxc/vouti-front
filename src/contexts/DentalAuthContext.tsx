import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DentalProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  especialidade: string | null;
  crm: string | null;
  created_at: string;
  updated_at: string;
}

interface DentalAuthContextType {
  user: User | null;
  session: Session | null;
  profile: DentalProfile | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, especialidade?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const DentalAuthContext = createContext<DentalAuthContextType | undefined>(undefined);

export const DentalAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DentalProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
      const { data: profileData, error: profileError } = await (supabase as any)
        .from('dental_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData as DentalProfile);

      const { data: roleData } = await (supabase as any)
        .from('dental_user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!roleData);
    } catch (error) {
      console.error('Error loading dental profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      toast({
        title: "Bem-vindo ao Sistema Dental!",
        description: "Login realizado com sucesso.",
      });
    }

    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, especialidade?: string) => {
    const dentalEmail = email.includes('@dental.local') ? email : `${email.split('@')[0]}@dental.local`;
    
    const { data, error } = await supabase.auth.signUp({
      email: dentalEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          especialidade: especialidade
        }
      }
    });

    if (error) return { error };

    if (data.user) {
      await (supabase as any)
        .from('dental_user_roles')
        .insert({ user_id: data.user.id, role: 'dentista' });
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <DentalAuthContext.Provider value={{
      user,
      session,
      profile,
      isAdmin,
      signIn,
      signUp,
      signOut,
      loading
    }}>
      {children}
    </DentalAuthContext.Provider>
  );
};

export const useDentalAuth = () => {
  const context = useContext(DentalAuthContext);
  if (!context) {
    throw new Error('useDentalAuth must be used within a DentalAuthProvider');
  }
  return context;
};
