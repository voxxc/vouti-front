import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectAdvogado {
  id: string;
  projectId: string;
  nomeAdvogado: string | null;
  emailAdvogado: string | null;
  telefoneAdvogado: string | null;
  enderecoAdvogado: string | null;
  cidadeAdvogado: string | null;
  cepAdvogado: string | null;
  logoUrl: string | null;
  tenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectAdvogadoData {
  nomeAdvogado?: string | null;
  emailAdvogado?: string | null;
  telefoneAdvogado?: string | null;
  enderecoAdvogado?: string | null;
  cidadeAdvogado?: string | null;
  cepAdvogado?: string | null;
  logoUrl?: string | null;
}

export function useProjectAdvogado(projectId: string) {
  const [advogado, setAdvogado] = useState<ProjectAdvogado | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAdvogado = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_advogados')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAdvogado({
          id: data.id,
          projectId: data.project_id,
          nomeAdvogado: data.nome_advogado,
          emailAdvogado: data.email_advogado,
          telefoneAdvogado: data.telefone_advogado,
          enderecoAdvogado: data.endereco_advogado,
          cidadeAdvogado: data.cidade_advogado,
          cepAdvogado: data.cep_advogado,
          logoUrl: data.logo_url,
          tenantId: data.tenant_id,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        });
      } else {
        setAdvogado(null);
      }
    } catch (error) {
      console.error('Erro ao buscar advogado do projeto:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchAdvogado();
  }, [fetchAdvogado]);

  const createAdvogado = async (data: ProjectAdvogadoData) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data: newAdvogado, error } = await supabase
        .from('project_advogados')
        .insert({
          project_id: projectId,
          nome_advogado: data.nomeAdvogado,
          email_advogado: data.emailAdvogado,
          telefone_advogado: data.telefoneAdvogado,
          endereco_advogado: data.enderecoAdvogado,
          cidade_advogado: data.cidadeAdvogado,
          cep_advogado: data.cepAdvogado,
          logo_url: data.logoUrl,
          tenant_id: profile?.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Perfil do advogado criado com sucesso.',
      });

      await fetchAdvogado();
      return newAdvogado;
    } catch (error) {
      console.error('Erro ao criar advogado:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o perfil do advogado.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateAdvogado = async (data: ProjectAdvogadoData) => {
    if (!advogado) {
      return createAdvogado(data);
    }

    try {
      const { error } = await supabase
        .from('project_advogados')
        .update({
          nome_advogado: data.nomeAdvogado,
          email_advogado: data.emailAdvogado,
          telefone_advogado: data.telefoneAdvogado,
          endereco_advogado: data.enderecoAdvogado,
          cidade_advogado: data.cidadeAdvogado,
          cep_advogado: data.cepAdvogado,
          logo_url: data.logoUrl,
        })
        .eq('id', advogado.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Perfil do advogado atualizado com sucesso.',
      });

      await fetchAdvogado();
    } catch (error) {
      console.error('Erro ao atualizar advogado:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil do advogado.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}-${Date.now()}.${fileExt}`;
      const filePath = `project-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('advogado-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('advogado-logos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer upload do logo.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const removeLogo = async () => {
    if (!advogado?.logoUrl) return;

    try {
      // Extract file path from URL
      const urlParts = advogado.logoUrl.split('/');
      const filePath = urlParts.slice(-2).join('/');

      await supabase.storage.from('advogado-logos').remove([filePath]);

      await updateAdvogado({ ...advogado, logoUrl: null });
    } catch (error) {
      console.error('Erro ao remover logo:', error);
    }
  };

  return {
    advogado,
    loading,
    refetch: fetchAdvogado,
    createAdvogado,
    updateAdvogado,
    uploadLogo,
    removeLogo,
  };
}
