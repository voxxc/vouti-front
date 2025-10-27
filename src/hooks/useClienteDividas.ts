import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClienteDivida, CreateDividaData } from '@/types/financeiro';
import { toast } from 'sonner';

export const useClienteDividas = (clienteId: string | null) => {
  const [dividas, setDividas] = useState<ClienteDivida[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDividas = async () => {
    if (!clienteId) {
      setDividas([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cliente_dividas')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDividas((data || []) as ClienteDivida[]);
    } catch (error) {
      console.error('Erro ao buscar dívidas:', error);
      toast.error('Erro ao carregar dívidas do cliente');
      setDividas([]);
    } finally {
      setLoading(false);
    }
  };

  const createDivida = async (dados: CreateDividaData): Promise<boolean> => {
    if (!clienteId) {
      toast.error('Cliente não identificado');
      return false;
    }

    try {
      // Calcular valores
      const valorParcela = dados.valor_total / dados.numero_parcelas;
      
      // Calcular data final (baseado em parcelas mensais)
      const dataInicio = new Date(dados.data_inicio);
      const dataFinal = new Date(dataInicio);
      dataFinal.setMonth(dataFinal.getMonth() + dados.numero_parcelas - 1);

      // Criar dívida
      const { data: dividaData, error: dividaError } = await supabase
        .from('cliente_dividas')
        .insert({
          cliente_id: clienteId,
          titulo: dados.titulo,
          descricao: dados.descricao,
          valor_total: dados.valor_total,
          numero_parcelas: dados.numero_parcelas,
          valor_parcela: valorParcela,
          data_inicio: dados.data_inicio,
          data_vencimento_final: dataFinal.toISOString().split('T')[0],
          status: 'ativo',
        })
        .select()
        .single();

      if (dividaError) throw dividaError;

      // Gerar parcelas
      const parcelas = [];
      for (let i = 1; i <= dados.numero_parcelas; i++) {
        const dataVencimento = new Date(dataInicio);
        dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1));
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(dataVencimento);
        vencimento.setHours(0, 0, 0, 0);
        
        const status = vencimento < hoje ? 'atrasado' : 'pendente';

        parcelas.push({
          cliente_id: clienteId,
          divida_id: dividaData.id,
          numero_parcela: i,
          valor_parcela: valorParcela,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          status: status,
        });
      }

      const { error: parcelasError } = await supabase
        .from('cliente_parcelas')
        .insert(parcelas);

      if (parcelasError) throw parcelasError;

      toast.success('Dívida criada com sucesso!');
      await fetchDividas();
      return true;
    } catch (error) {
      console.error('Erro ao criar dívida:', error);
      toast.error('Erro ao criar dívida');
      return false;
    }
  };

  const updateDivida = async (dividaId: string, dados: Partial<ClienteDivida>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cliente_dividas')
        .update(dados)
        .eq('id', dividaId);

      if (error) throw error;

      toast.success('Dívida atualizada com sucesso!');
      await fetchDividas();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar dívida:', error);
      toast.error('Erro ao atualizar dívida');
      return false;
    }
  };

  const deleteDivida = async (dividaId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cliente_dividas')
        .delete()
        .eq('id', dividaId);

      if (error) throw error;

      toast.success('Dívida excluída com sucesso!');
      await fetchDividas();
      return true;
    } catch (error) {
      console.error('Erro ao excluir dívida:', error);
      toast.error('Erro ao excluir dívida');
      return false;
    }
  };

  useEffect(() => {
    fetchDividas();
  }, [clienteId]);

  return {
    dividas,
    loading,
    fetchDividas,
    createDivida,
    updateDivida,
    deleteDivida,
  };
};
