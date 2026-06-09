import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from './useTenantId';
import { toast } from '@/hooks/use-toast';
import type { FichaCadastral } from '@/lib/fichaCadastral/schema';

export const useFichaCadastral = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { tenantId } = useTenantId();

  const fetchByCliente = async (clienteId: string): Promise<FichaCadastral | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes_ficha_cadastral')
        .select('dados_contrato, outros_clientes, contas, dividas, cliente_id')
        .eq('cliente_id', clienteId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      // cliente_principal vem da tabela clientes; o caller resolve.
      return {
        cliente_principal: { nome: '', cpf: '', rg: '', estado_civil: '', profissao: '', telefone: '', email: '', endereco: '', responsavel_contrato: true },
        outros_clientes: (data.outros_clientes as any) || [],
        contas: (data.contas as any) || [],
        dividas: (data.dividas as any) || [],
        dados_contrato: (data.dados_contrato as any) || {},
      } as FichaCadastral;
    } finally {
      setLoading(false);
    }
  };

  const upsert = async (clienteId: string, ficha: FichaCadastral) => {
    if (!user || !tenantId) throw new Error('Sessão inválida');
    setLoading(true);
    try {
      const payload = {
        cliente_id: clienteId,
        tenant_id: tenantId,
        created_by: user.id,
        dados_contrato: ficha.dados_contrato as any,
        outros_clientes: ficha.outros_clientes as any,
        contas: ficha.contas as any,
        dividas: ficha.dividas as any,
      };
      const { error } = await supabase
        .from('clientes_ficha_cadastral')
        .upsert(payload, { onConflict: 'cliente_id' });
      if (error) throw error;
      return true;
    } catch (e: any) {
      toast({ title: 'Erro ao salvar ficha', description: e.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { loading, fetchByCliente, upsert };
};