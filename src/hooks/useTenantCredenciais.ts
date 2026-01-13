import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CredencialCliente {
  id: string;
  tenant_id: string;
  oab_id: string | null;
  cpf: string;
  senha: string;
  secret: string | null;
  documento_url: string | null;
  documento_nome: string | null;
  status: 'pendente' | 'enviado' | 'erro';
  enviado_judit_em: string | null;
  enviado_por: string | null;
  erro_mensagem: string | null;
  created_at: string;
  updated_at: string;
  oabs_cadastradas?: {
    oab_numero: string;
    oab_uf: string;
    nome_advogado: string | null;
  };
}

interface CredencialJudit {
  id: string;
  tenant_id: string;
  oab_id: string | null;
  credencial_cliente_id: string | null;
  customer_key: string;
  system_name: string;
  username: string;
  status: 'active' | 'error';
  enviado_por: string | null;
  created_at: string;
  updated_at: string;
}

interface EnviarParaJuditData {
  credencialId: string;
  cpf: string;
  senha: string;
  secret: string;
  customerKey: string;
  oabId?: string;
}

export function useTenantCredenciais(tenantId: string | null) {
  const queryClient = useQueryClient();

  const { data: credenciaisCliente, isLoading: loadingCliente } = useQuery({
    queryKey: ['tenant-credenciais-cliente', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('credenciais_cliente')
        .select(`
          *,
          oabs_cadastradas (
            oab_numero,
            oab_uf,
            nome_advogado
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CredencialCliente[];
    },
    enabled: !!tenantId,
  });

  const { data: credenciaisJudit, isLoading: loadingJudit } = useQuery({
    queryKey: ['tenant-credenciais-judit', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('credenciais_judit')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CredencialJudit[];
    },
    enabled: !!tenantId,
  });

  const enviarParaJudit = useMutation({
    mutationFn: async (data: EnviarParaJuditData) => {
      if (!tenantId) throw new Error('Tenant não encontrado');

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Não autenticado');

      // Chamar edge function para enviar credenciais
      const response = await supabase.functions.invoke('judit-cofre-credenciais', {
        body: {
          cpf: data.cpf,
          senha: data.senha,
          secret: data.secret,
          customerKey: data.customerKey,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar para Judit');
      }

      // Atualizar status da credencial cliente
      const { error: updateError } = await supabase
        .from('credenciais_cliente')
        .update({
          status: 'enviado',
          enviado_judit_em: new Date().toISOString(),
          enviado_por: session.session.user.id,
        })
        .eq('id', data.credencialId);

      if (updateError) throw updateError;

      // Registrar na tabela credenciais_judit
      const { error: insertError } = await supabase
        .from('credenciais_judit')
        .insert({
          tenant_id: tenantId,
          oab_id: data.oabId || null,
          credencial_cliente_id: data.credencialId,
          customer_key: data.customerKey,
          system_name: '*',
          username: data.cpf,
          enviado_por: session.session.user.id,
        });

      if (insertError) throw insertError;

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-credenciais-cliente', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-credenciais-judit', tenantId] });
      toast.success('Credencial enviada para o cofre Judit com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao enviar para Judit:', error);
      toast.error('Erro ao enviar para Judit: ' + error.message);
    },
  });

  const marcarComoErro = useMutation({
    mutationFn: async ({ credencialId, mensagem }: { credencialId: string; mensagem: string }) => {
      const { error } = await supabase
        .from('credenciais_cliente')
        .update({
          status: 'erro',
          erro_mensagem: mensagem,
        })
        .eq('id', credencialId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-credenciais-cliente', tenantId] });
      toast.success('Status atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  return {
    credenciaisCliente: credenciaisCliente || [],
    credenciaisJudit: credenciaisJudit || [],
    isLoading: loadingCliente || loadingJudit,
    enviarParaJudit,
    marcarComoErro,
  };
}
