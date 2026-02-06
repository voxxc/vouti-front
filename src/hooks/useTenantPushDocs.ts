import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TipoDocumento = 'cpf' | 'cnpj' | 'oab';
export type TrackingStatus = 'pendente' | 'ativo' | 'pausado' | 'erro' | 'deletado';

export interface PushDoc {
  id: string;
  tenant_id: string;
  tipo_documento: TipoDocumento;
  documento: string;
  descricao: string | null;
  tracking_id: string | null;
  tracking_status: TrackingStatus;
  ultimo_request_id: string | null;
  recurrence: number;
  notification_emails: string[] | null;
  total_processos_recebidos: number;
  ultima_notificacao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushDocProcesso {
  id: string;
  push_doc_id: string;
  tenant_id: string;
  numero_cnj: string;
  tribunal: string | null;
  tribunal_sigla: string | null;
  parte_ativa: string | null;
  parte_passiva: string | null;
  status_processual: string | null;
  data_distribuicao: string | null;
  valor_causa: number | null;
  payload_completo: Record<string, unknown> | null;
  request_id: string | null;
  tracking_id: string | null;
  lido: boolean;
  created_at: string;
}

interface UseTenantPushDocsReturn {
  pushDocs: PushDoc[];
  processosRecebidos: PushDocProcesso[];
  isLoading: boolean;
  isCadastrando: boolean;
  cadastrarPushDoc: (data: {
    tipoDocumento: TipoDocumento;
    documento: string;
    descricao?: string;
    recurrence?: number;
  }) => Promise<boolean>;
  pausarPushDoc: (pushDocId: string) => Promise<boolean>;
  reativarPushDoc: (pushDocId: string) => Promise<boolean>;
  deletarPushDoc: (pushDocId: string) => Promise<boolean>;
  marcarComoLido: (processoId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTenantPushDocs(tenantId: string): UseTenantPushDocsReturn {
  const [pushDocs, setPushDocs] = useState<PushDoc[]>([]);
  const [processosRecebidos, setProcessosRecebidos] = useState<PushDocProcesso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCadastrando, setIsCadastrando] = useState(false);

  const fetchPushDocs = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('push_docs_cadastrados')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('tracking_status', 'deletado')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPushDocs((data || []) as PushDoc[]);
    } catch (error) {
      console.error('Erro ao buscar push docs:', error);
      toast.error('Erro ao carregar documentos cadastrados');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  const fetchProcessosRecebidos = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('push_docs_processos')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setProcessosRecebidos((data || []) as PushDocProcesso[]);
    } catch (error) {
      console.error('Erro ao buscar processos recebidos:', error);
    }
  }, [tenantId]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchPushDocs(), fetchProcessosRecebidos()]);
  }, [fetchPushDocs, fetchProcessosRecebidos]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const cadastrarPushDoc = async (data: {
    tipoDocumento: TipoDocumento;
    documento: string;
    descricao?: string;
    recurrence?: number;
  }): Promise<boolean> => {
    try {
      setIsCadastrando(true);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Sessão expirada. Faça login novamente.');
        return false;
      }

      // Refresh token antes da chamada
      await supabase.auth.refreshSession();
      const { data: refreshedSession } = await supabase.auth.getSession();

      const response = await fetch(
        `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/judit-push-docs-cadastrar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshedSession?.session?.access_token}`,
          },
          body: JSON.stringify({
            tenantId,
            tipoDocumento: data.tipoDocumento,
            documento: data.documento,
            descricao: data.descricao,
            recurrence: data.recurrence || 1,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao cadastrar documento');
      }

      toast.success('Documento cadastrado para monitoramento!');
      await refetch();
      return true;
    } catch (error) {
      console.error('Erro ao cadastrar push doc:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao cadastrar documento');
      return false;
    } finally {
      setIsCadastrando(false);
    }
  };

  const pausarPushDoc = async (pushDocId: string): Promise<boolean> => {
    try {
      const pushDoc = pushDocs.find(pd => pd.id === pushDocId);
      if (!pushDoc?.tracking_id) {
        toast.error('Documento não possui tracking ativo');
        return false;
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Sessão expirada');
        return false;
      }

      await supabase.auth.refreshSession();
      const { data: refreshedSession } = await supabase.auth.getSession();

      const response = await fetch(
        `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/judit-push-docs-toggle`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshedSession?.session?.access_token}`,
          },
          body: JSON.stringify({
            pushDocId,
            action: 'pause',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao pausar monitoramento');
      }

      toast.success('Monitoramento pausado');
      await refetch();
      return true;
    } catch (error) {
      console.error('Erro ao pausar push doc:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao pausar');
      return false;
    }
  };

  const reativarPushDoc = async (pushDocId: string): Promise<boolean> => {
    try {
      const pushDoc = pushDocs.find(pd => pd.id === pushDocId);
      if (!pushDoc?.tracking_id) {
        toast.error('Documento não possui tracking');
        return false;
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Sessão expirada');
        return false;
      }

      await supabase.auth.refreshSession();
      const { data: refreshedSession } = await supabase.auth.getSession();

      const response = await fetch(
        `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/judit-push-docs-toggle`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshedSession?.session?.access_token}`,
          },
          body: JSON.stringify({
            pushDocId,
            action: 'resume',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao reativar monitoramento');
      }

      toast.success('Monitoramento reativado');
      await refetch();
      return true;
    } catch (error) {
      console.error('Erro ao reativar push doc:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao reativar');
      return false;
    }
  };

  const deletarPushDoc = async (pushDocId: string): Promise<boolean> => {
    try {
      const pushDoc = pushDocs.find(pd => pd.id === pushDocId);
      
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Sessão expirada');
        return false;
      }

      await supabase.auth.refreshSession();
      const { data: refreshedSession } = await supabase.auth.getSession();

      // Se tiver tracking_id, deletar na Judit também
      if (pushDoc?.tracking_id) {
        const response = await fetch(
          `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/judit-push-docs-toggle`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${refreshedSession?.session?.access_token}`,
            },
            body: JSON.stringify({
              pushDocId,
              action: 'delete',
            }),
          }
        );

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Erro ao deletar na Judit');
        }
      }

      // Atualizar status para deletado no banco local
      const { error } = await supabase
        .from('push_docs_cadastrados')
        .update({ tracking_status: 'deletado' })
        .eq('id', pushDocId);

      if (error) throw error;

      toast.success('Documento removido do monitoramento');
      await refetch();
      return true;
    } catch (error) {
      console.error('Erro ao deletar push doc:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar');
      return false;
    }
  };

  const marcarComoLido = async (processoId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('push_docs_processos')
        .update({ lido: true })
        .eq('id', processoId);

      if (error) throw error;
      
      setProcessosRecebidos(prev => 
        prev.map(p => p.id === processoId ? { ...p, lido: true } : p)
      );
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
    }
  };

  return {
    pushDocs,
    processosRecebidos,
    isLoading,
    isCadastrando,
    cadastrarPushDoc,
    pausarPushDoc,
    reativarPushDoc,
    deletarPushDoc,
    marcarComoLido,
    refetch,
  };
}
