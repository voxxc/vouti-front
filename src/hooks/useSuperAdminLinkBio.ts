import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface LinkBioProfile {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  link_count: number;
}

export function useSuperAdminLinkBio() {
  const [profiles, setProfiles] = useState<LinkBioProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data: linkProfiles, error } = await supabase
        .from('link_profiles')
        .select('id, user_id, username, full_name, bio, avatar_url, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch link counts for each profile
      const profilesWithCounts: LinkBioProfile[] = await Promise.all(
        (linkProfiles || []).map(async (p) => {
          const { count } = await supabase
            .from('link_items')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', p.id);

          return { ...p, link_count: count || 0 };
        })
      );

      setProfiles(profilesWithCounts);
    } catch (err: any) {
      console.error('Erro ao buscar perfis link-in-bio:', err);
      toast({ title: 'Erro', description: 'Falha ao carregar perfis', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const createProfile = async (data: {
    username: string;
    full_name: string;
    email: string;
    password: string;
    bio?: string;
  }) => {
    try {
      const { data: sessionData } = await supabase.auth.refreshSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast({ title: 'Erro', description: 'Sessão expirada', variant: 'destructive' });
        return false;
      }

      const { data: result, error } = await supabase.functions.invoke('create-linkbio-profile', {
        body: data,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast({ title: 'Sucesso', description: `Perfil @${data.username} criado com sucesso!` });
      await fetchProfiles();
      return true;
    } catch (err: any) {
      toast({ title: 'Erro ao criar perfil', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const deleteProfile = async (userId: string, username: string) => {
    if (!confirm(`Excluir perfil @${username}? Esta ação é irreversível.`)) return;

    try {
      const { data: sessionData } = await supabase.auth.refreshSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast({ title: 'Erro', description: 'Sessão expirada', variant: 'destructive' });
        return;
      }

      // Use delete-tenant edge function pattern or direct admin API
      // For now, delete profile data (auth user deletion requires admin API)
      const { error: linksError } = await supabase
        .from('link_items')
        .delete()
        .eq('profile_id', profiles.find(p => p.user_id === userId)?.id || '');

      const { error: rolesError } = await supabase
        .from('link_user_roles')
        .delete()
        .eq('user_id', userId);

      const { error: profileError } = await supabase
        .from('link_profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast({ title: 'Excluído', description: `Perfil @${username} removido.` });
      await fetchProfiles();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    }
  };

  return { profiles, loading, createProfile, deleteProfile, refetch: fetchProfiles };
}
