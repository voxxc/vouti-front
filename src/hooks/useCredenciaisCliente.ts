import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTenantId } from './useTenantId';

interface CredencialCliente {
  id: string;
  tenant_id: string;
  oab_id: string | null;
  cpf: string;
  senha: string;
  documento_url: string | null;
  documento_nome: string | null;
  status: string;
  enviado_judit_em: string | null;
  enviado_por: string | null;
  erro_mensagem: string | null;
  created_at: string;
  updated_at: string;
  oabs_cadastradas?: {
    oab_numero: string;
    oab_uf: string;
    nome_advogado: string | null;
  } | null;
}

interface CreateCredencialData {
  oab_numero: string;
  oab_uf: string;
  cpf: string;
  senha: string;
  documento?: File;
}

export function useCredenciaisCliente() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenantId();
  const [uploading, setUploading] = useState(false);

  const { data: credenciais, isLoading, refetch } = useQuery({
    queryKey: ['credenciais-cliente', tenantId],
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

  const createCredencial = useMutation({
    mutationFn: async (data: CreateCredencialData) => {
      if (!tenantId) throw new Error('Tenant não encontrado');

      let documentoUrl: string | null = null;
      let documentoNome: string | null = null;

      // Upload do documento se existir
      if (data.documento) {
        setUploading(true);
        const fileExt = data.documento.name.split('.').pop();
        const fileName = `${tenantId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('credenciais-documentos')
          .upload(fileName, data.documento);

        if (uploadError) {
          setUploading(false);
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('credenciais-documentos')
          .getPublicUrl(fileName);

        documentoUrl = urlData.publicUrl;
        documentoNome = data.documento.name;
        setUploading(false);
      }

      // Inserir credencial com OAB número e UF diretamente
      const insertData = {
        tenant_id: tenantId,
        cpf: data.cpf.replace(/\D/g, ''),
        senha: data.senha,
        documento_url: documentoUrl,
        documento_nome: documentoNome,
        oab_id: null as string | null,
      };

      // Buscar OAB existente pelo número e UF
      const { data: oabExistente } = await supabase
        .from('oabs_cadastradas')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('oab_numero', data.oab_numero.trim())
        .eq('oab_uf', data.oab_uf.trim().toUpperCase())
        .single();

      if (oabExistente) {
        insertData.oab_id = oabExistente.id;
      }

      const { data: credencial, error } = await supabase
        .from('credenciais_cliente')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return credencial;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credenciais-cliente'] });
      toast.success('Credencial enviada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao criar credencial:', error);
      toast.error('Erro ao enviar credencial: ' + error.message);
    },
  });

  const deleteCredencial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('credenciais_cliente')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credenciais-cliente'] });
      toast.success('Credencial removida');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover credencial: ' + error.message);
    },
  });

  return {
    credenciais: credenciais || [],
    isLoading,
    uploading,
    createCredencial,
    deleteCredencial,
    refetch,
  };
}
