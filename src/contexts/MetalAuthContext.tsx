import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import type { MetalProfile } from '@/types/metal';

interface MetalAuthContextType {
  user: User | null;
  session: Session | null;
  profile: MetalProfile | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, setor?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const MetalAuthContext = createContext<MetalAuthContextType | undefined>(undefined);

export const MetalAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MetalProfile | null>(null);
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
        .from('metal_profiles' as any)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData as unknown as MetalProfile);

      const { data: roleData } = await supabase
        .from('metal_user_roles' as any)
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!roleData);
    } catch (error) {
      console.error('Error loading metal profile:', error);
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
        title: "Bem-vindo ao MetalSystem!",
        description: "Login realizado com sucesso.",
      });
    }

    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, setor?: string) => {
    const redirectUrl = `${window.location.origin}/metal-auth`;
    
    // Check if this is the first user
    const { count } = await supabase
      .from('metal_profiles' as any)
      .select('*', { count: 'exact', head: true });

    const isFirstUser = count === 0;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          setor: setor || null,
        },
      },
    });

    if (!error && data.user) {
      await supabase.from('metal_profiles' as any).insert({
        user_id: data.user.id,
        email,
        full_name: fullName,
        setor: setor || null,
      });

      // If first user, make them admin
      if (isFirstUser) {
        await supabase.from('metal_user_roles' as any).insert({
          user_id: data.user.id,
          role: 'admin',
        });
      }

      toast({
        title: "Conta criada!",
        description: isFirstUser 
          ? "Bem-vindo ao MetalSystem! Você é o administrador." 
          : "Bem-vindo ao MetalSystem.",
      });
    }

    return { error };
  };

  const signOut = async () => {
    // Always clear local state first to ensure UI updates
    setProfile(null);
    setIsAdmin(false);
    setUser(null);
    setSession(null);
    
    try {
      // Try to sign out from Supabase, but don't block on errors
      await supabase.auth.signOut();
    } catch (error) {
      // Silently ignore logout errors - local state is already cleared
      console.log('Logout completed (session may have been expired)');
    } finally {
      navigate('/metal-auth');
      
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
    <MetalAuthContext.Provider value={value}>
      {children}
    </MetalAuthContext.Provider>
  );
};

export const useMetalAuth = () => {
  const context = useContext(MetalAuthContext);
  if (context === undefined) {
    throw new Error('useMetalAuth must be used within a MetalAuthProvider');
  }
  return context;
};
