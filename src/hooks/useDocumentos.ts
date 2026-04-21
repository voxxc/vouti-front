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

export function useDocumentos(filtro?: 'modelo' | 'documento' | 'todos') {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();
  const tipoFiltro = filtro ?? 'todos';

  // Lista de documentos
  const {
    data: documentos = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['documentos', tenantId, tipoFiltro],
    queryFn: async (): Promise<DocumentoWithRelations[]> => {
      let query = supabase
        .from('documentos')
        .select(`
          *,
          cliente:clientes(id, nome_pessoa_fisica, nome_pessoa_juridica),
          projeto:projects(id, name),
          responsavel:profiles!documentos_responsavel_id_fkey(user_id, full_name),
          modelo_origem:documentos!documentos_modelo_origem_id_fkey(id, titulo)
        `);
      if (tipoFiltro !== 'todos') {
        query = query.eq('tipo', tipoFiltro);
      }
      const { data, error } = await query.order('updated_at', { ascending: false });

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
          cabecalho_html: data.cabecalho_html || null,
          rodape_html: data.rodape_html || null,
          cliente_id: data.cliente_id || null,
          projeto_id: data.projeto_id || null,
          responsavel_id: data.responsavel_id || user.id,
          tipo: data.tipo || 'documento',
          modelo_origem_id: data.modelo_origem_id || null,
          tenant_id: tenantId
        } as any)
        .select()
        .single();

      if (error) throw error;
      return result as Documento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
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
        } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as Documento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      queryClient.invalidateQueries({ queryKey: ['documento'] });
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
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      toast.success('Documento excluído');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir documento: ' + error.message);
    }
  });

  // Gerar instância de documento a partir de um modelo
  const gerarDeModeloMutation = useMutation({
    mutationFn: async ({ modeloId, clienteId }: { modeloId: string; clienteId?: string }) => {
      if (!tenantId || !user?.id) throw new Error('Usuário não autenticado');

      const { data: modelo, error: errModelo } = await supabase
        .from('documentos')
        .select('titulo, descricao, conteudo_html, cabecalho_html, rodape_html')
        .eq('id', modeloId)
        .single();
      if (errModelo) throw errModelo;

      const { data: result, error } = await supabase
        .from('documentos')
        .insert({
          titulo: modelo.titulo,
          descricao: modelo.descricao,
          conteudo_html: modelo.conteudo_html,
          cabecalho_html: (modelo as any).cabecalho_html ?? null,
          rodape_html: (modelo as any).rodape_html ?? null,
          cliente_id: clienteId || null,
          responsavel_id: user.id,
          tipo: 'documento',
          modelo_origem_id: modeloId,
          tenant_id: tenantId
        } as any)
        .select()
        .single();
      if (error) throw error;
      return result as Documento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      toast.success('Documento gerado a partir do modelo');
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar documento: ' + error.message);
    }
  });

  return {
    documentos,
    isLoading,
    error,
    createDocumento: createMutation.mutateAsync,
    updateDocumento: updateMutation.mutateAsync,
    deleteDocumento: deleteMutation.mutateAsync,
    gerarDeModelo: gerarDeModeloMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isGenerating: gerarDeModeloMutation.isPending,
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
          responsavel:profiles!documentos_responsavel_id_fkey(user_id, full_name),
          modelo_origem:documentos!documentos_modelo_origem_id_fkey(id, titulo)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as DocumentoWithRelations;
    },
    enabled: !!id && !!tenantId
  });
}
