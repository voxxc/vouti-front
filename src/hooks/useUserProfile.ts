import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface UserProfileData {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  data_nascimento: string | null;
  email_pessoal: string | null;
  telefone: string | null;
  endereco: string | null;
  contato_emergencia_nome: string | null;
  contato_emergencia_telefone: string | null;
  contato_emergencia_relacao: string | null;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          user_id,
          full_name,
          avatar_url,
          data_nascimento,
          email_pessoal,
          telefone,
          endereco,
          contato_emergencia_nome,
          contato_emergencia_telefone,
          contato_emergencia_relacao
        `)
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Erro ao buscar perfil:", error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfileData>) => {
    if (!user?.id) throw new Error("Usuário não autenticado");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: updates.full_name,
        data_nascimento: updates.data_nascimento || null,
        email_pessoal: updates.email_pessoal || null,
        telefone: updates.telefone || null,
        endereco: updates.endereco || null,
        contato_emergencia_nome: updates.contato_emergencia_nome || null,
        contato_emergencia_telefone: updates.contato_emergencia_telefone || null,
        contato_emergencia_relacao: updates.contato_emergencia_relacao || null,
      })
      .eq("user_id", user.id);

    if (error) throw error;

    // Atualiza o estado local
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  return {
    profile,
    loading,
    updateProfile,
    refetch: fetchProfile,
  };
};
