import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

type SpnRole = 'admin' | 'teacher' | 'student';

interface SpnProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface SpnAuthContextType {
  user: User | null;
  session: Session | null;
  profile: SpnProfile | null;
  role: SpnRole;
  isAdmin: boolean;
  isTeacher: boolean;
  isSpnUser: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const SpnAuthContext = createContext<SpnAuthContextType | undefined>(undefined);

export const SpnAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SpnProfile | null>(null);
  const [role, setRole] = useState<SpnRole>('student');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => loadUserProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setRole('student');
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
      const { data: profileData } = await supabase
        .from('spn_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileData) setProfile(profileData as unknown as SpnProfile);

      // Check roles in priority: admin > teacher > student
      const { data: roles } = await supabase
        .from('spn_user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roles && roles.length > 0) {
        const roleValues = roles.map(r => r.role as string);
        if (roleValues.includes('admin')) setRole('admin');
        else if (roleValues.includes('teacher')) setRole('teacher');
        else setRole('student');
      } else {
        setRole('student');
      }
    } catch (error) {
      console.error('Error loading SPN profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      toast({ title: "Welcome to Vouti.SPN!", description: "Login successful." });
    }
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { count } = await supabase
      .from('spn_profiles')
      .select('*', { count: 'exact', head: true });

    const isFirstUser = count === 0;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/spn/auth`,
        data: { full_name: fullName },
      },
    });

    if (!error && data.user) {
      await supabase.from('spn_profiles').insert({
        user_id: data.user.id,
        full_name: fullName,
      });

      await supabase.from('spn_user_roles').insert({
        user_id: data.user.id,
        role: isFirstUser ? 'admin' : 'student',
      });

      toast({
        title: "Account created!",
        description: isFirstUser
          ? "Welcome! You are the administrator."
          : "Welcome to Vouti.SPN!",
      });
    }

    return { error };
  };

  const signOut = async () => {
    setProfile(null);
    setRole('student');
    setUser(null);
    setSession(null);
    try { await supabase.auth.signOut(); } catch {}
    navigate('/spn/auth');
    toast({ title: "Logged out", description: "See you later!" });
  };

  return (
    <SpnAuthContext.Provider value={{
      user, session, profile, role,
      isAdmin: role === 'admin',
      isTeacher: role === 'teacher',
      signIn, signUp, signOut, loading,
    }}>
      {children}
    </SpnAuthContext.Provider>
  );
};

export const useSpnAuth = () => {
  const context = useContext(SpnAuthContext);
  if (!context) throw new Error('useSpnAuth must be used within SpnAuthProvider');
  return context;
};
