import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Aviso {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string;
  system_type_id: string | null;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
  total_ciencias?: number;
}

export interface CreateAvisoData {
  titulo: string;
  descricao?: string;
  imagem_url: string;
  system_type_id: string;
}

export function useSuperAdminAvisos(systemTypeId?: string) {
  const queryClient = useQueryClient();

  const { data: avisos = [], isLoading } = useQuery({
    queryKey: ['super-admin-avisos', systemTypeId],
    queryFn: async () => {
      let query = supabase
        .from('avisos_sistema')
        .select('*')
        .order('created_at', { ascending: false });

      if (systemTypeId) {
        query = query.eq('system_type_id', systemTypeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get ciencia counts for each aviso
      const avisosWithCounts = await Promise.all(
        (data || []).map(async (aviso) => {
          const { count } = await supabase
            .from('avisos_ciencia')
            .select('*', { count: 'exact', head: true })
            .eq('aviso_id', aviso.id);
          
          return {
            ...aviso,
            total_ciencias: count || 0
          };
        })
      );

      return avisosWithCounts as Aviso[];
    },
    enabled: !!systemTypeId
  });

  const createAviso = useMutation({
    mutationFn: async (data: CreateAvisoData) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: aviso, error } = await supabase
        .from('avisos_sistema')
        .insert({
          titulo: data.titulo,
          descricao: data.descricao || null,
          imagem_url: data.imagem_url,
          system_type_id: data.system_type_id,
          created_by: userData.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return aviso;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-avisos'] });
      toast({ title: 'Aviso criado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao criar aviso', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const toggleAvisoStatus = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('avisos_sistema')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-avisos'] });
      toast({ title: 'Status atualizado!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao atualizar status', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const deleteAviso = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('avisos_sistema')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-avisos'] });
      toast({ title: 'Aviso excluído!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao excluir aviso', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `avisos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avisos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avisos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  return {
    avisos,
    isLoading,
    createAviso,
    toggleAvisoStatus,
    deleteAviso,
    uploadImage
  };
}
