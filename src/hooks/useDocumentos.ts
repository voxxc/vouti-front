import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/hooks/useTenantId';
import { toast } from 'sonner';
import type { 
  Documento, 
  DocumentoWithRelations, 
  CreateDocumentoData, 
  UpdateDocumentoData 
} from '@/types/documento';

export function useDocumentos() {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();

  // Lista de documentos
  const {
    data: documentos = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['documentos', tenantId],
    queryFn: async (): Promise<DocumentoWithRelations[]> => {
      const { data, error } = await supabase
        .from('documentos')
        .select(`
          *,
          cliente:clientes(id, nome_pessoa_fisica, nome_pessoa_juridica),
          projeto:projects(id, name),
          responsavel:profiles!documentos_responsavel_id_fkey(user_id, full_name)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as DocumentoWithRelations[];
    },
    enabled: !!tenantId
  });

  // Criar documento
  const createMutation = useMutation({
    mutationFn: async (data: CreateDocumentoData) => {
      if (!tenantId || !user?.id) throw new Error('Usuário não autenticado');

      const { data: result, error } = await supabase
        .from('documentos')
        .insert({
          titulo: data.titulo,
          descricao: data.descricao || null,
          conteudo_html: data.conteudo_html || null,
          cliente_id: data.cliente_id || null,
          projeto_id: data.projeto_id || null,
          responsavel_id: data.responsavel_id || user.id,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (error) throw error;
      return result as Documento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', tenantId] });
      toast.success('Documento criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar documento: ' + error.message);
    }
  });

  // Atualizar documento
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDocumentoData }) => {
      const { data: result, error } = await supabase
        .from('documentos')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as Documento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', tenantId] });
      toast.success('Documento salvo');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar documento: ' + error.message);
    }
  });

  // Deletar documento
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('documentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', tenantId] });
      toast.success('Documento excluído');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir documento: ' + error.message);
    }
  });

  return {
    documentos,
    isLoading,
    error,
    createDocumento: createMutation.mutateAsync,
    updateDocumento: updateMutation.mutateAsync,
    deleteDocumento: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}

// Hook para buscar um documento específico
export function useDocumento(id: string | undefined) {
  const { tenantId } = useTenantId();

  return useQuery({
    queryKey: ['documento', id],
    queryFn: async (): Promise<DocumentoWithRelations | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('documentos')
        .select(`
          *,
          cliente:clientes(id, nome_pessoa_fisica, nome_pessoa_juridica),
          projeto:projects(id, name),
          responsavel:profiles!documentos_responsavel_id_fkey(user_id, full_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as DocumentoWithRelations;
    },
    enabled: !!id && !!tenantId
  });
}
