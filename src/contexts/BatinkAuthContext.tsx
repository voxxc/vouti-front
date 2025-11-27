import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface BatinkProfile {
  id: string;
  user_id: string;
  empresa: string | null;
  full_name: string | null;
  cargo: string | null;
  created_at: string;
  updated_at: string;
}

interface BatinkAuthContextType {
  user: User | null;
  session: Session | null;
  profile: BatinkProfile | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, empresa?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const BatinkAuthContext = createContext<BatinkAuthContextType | undefined>(undefined);

export const BatinkAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<BatinkProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      const { data: profileData, error: profileError } = await supabase
        .from('batink_profiles' as any)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData as unknown as BatinkProfile);

      const { data: roleData } = await supabase
        .from('batink_user_roles' as any)
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!roleData);
    } catch (error) {
      console.error('Error loading batink profile:', error);
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
        title: "Bem-vindo ao BATINK!",
        description: "Login realizado com sucesso.",
      });
    }

    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, empresa?: string) => {
    const redirectUrl = `${window.location.origin}/batink/auth`;
    
    // Check if this is the first user
    const { count } = await supabase
      .from('batink_profiles' as any)
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
      await supabase.from('batink_profiles' as any).insert({
        user_id: data.user.id,
        full_name: fullName,
        empresa: empresa || null,
      });

      // If first user, make them admin
      if (isFirstUser) {
        await supabase.from('batink_user_roles' as any).insert({
          user_id: data.user.id,
          role: 'admin',
        });
      }

      toast({
        title: "Conta criada!",
        description: isFirstUser 
          ? "Bem-vindo ao BATINK! Você é o administrador." 
          : "Bem-vindo ao BATINK.",
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
      navigate('/batink/auth');
      
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    }
  };

  const value = {
    user,
    session,
    profile,
    isAdmin,
    signIn,
    signUp,
    signOut,
    loading,
  };

  return (
    <BatinkAuthContext.Provider value={value}>
      {children}
    </BatinkAuthContext.Provider>
  );
};

export const useBatinkAuth = () => {
  const context = useContext(BatinkAuthContext);
  if (context === undefined) {
    throw new Error('useBatinkAuth must be used within a BatinkAuthProvider');
  }
  return context;
};
