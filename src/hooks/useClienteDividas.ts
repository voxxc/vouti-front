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
      toast.error('Cliente nao identificado');
      return false;
    }

    try {
      // Buscar tenant_id do cliente
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('tenant_id')
        .eq('id', clienteId)
        .single();
      
      const tenantId = clienteData?.tenant_id;

      // Verificar se e modo personalizado
      if (dados.grupos_parcelas && dados.grupos_parcelas.grupos.length > 0) {
        // Modo personalizado com grupos de parcelas
        const { grupos, entrada } = dados.grupos_parcelas;
        
        // Calcular total de parcelas e valor medio
        const totalParcelas = grupos.reduce((acc, g) => acc + g.quantidade, 0) + (entrada ? 1 : 0);
        const valorMedio = dados.valor_total / (totalParcelas || 1);
        
        // Calcular data final
        let dataFinal = new Date(dados.data_inicio);
        for (const grupo of grupos) {
          const grupoFinal = new Date(grupo.data_inicio);
          grupoFinal.setMonth(grupoFinal.getMonth() + grupo.quantidade - 1);
          if (grupoFinal > dataFinal) {
            dataFinal = grupoFinal;
          }
        }

        // Criar divida
        const { data: dividaData, error: dividaError } = await supabase
          .from('cliente_dividas')
          .insert({
            cliente_id: clienteId,
            tenant_id: tenantId,
            titulo: dados.titulo,
            descricao: dados.descricao,
            valor_total: dados.valor_total,
            numero_parcelas: totalParcelas,
            valor_parcela: valorMedio,
            data_inicio: dados.data_inicio,
            data_vencimento_final: dataFinal.toISOString().split('T')[0],
            status: 'ativo',
          })
          .select()
          .single();

        if (dividaError) throw dividaError;

        // Buscar o maior numero_parcela existente para este cliente
        const { data: maxParcela } = await supabase
          .from('cliente_parcelas')
          .select('numero_parcela')
          .eq('cliente_id', clienteId)
          .order('numero_parcela', { ascending: false })
          .limit(1)
          .maybeSingle();

        let parcelaNum = (maxParcela?.numero_parcela || 0) + 1;
        const parcelas: any[] = [];
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Adicionar entrada se houver
        if (entrada && entrada.valor > 0) {
          const vencimentoEntrada = new Date(entrada.data_vencimento);
          vencimentoEntrada.setHours(0, 0, 0, 0);
          
          parcelas.push({
            cliente_id: clienteId,
            tenant_id: tenantId,
            divida_id: dividaData.id,
            numero_parcela: 0,
            valor_parcela: entrada.valor,
            data_vencimento: entrada.data_vencimento,
            status: vencimentoEntrada < hoje ? 'atrasado' : 'pendente',
            grupo_descricao: 'Entrada',
          });
        }

        // Adicionar parcelas de cada grupo
        for (const grupo of grupos) {
          for (let i = 0; i < grupo.quantidade; i++) {
            const dataVencimento = new Date(grupo.data_inicio);
            dataVencimento.setMonth(dataVencimento.getMonth() + i);
            const vencimento = new Date(dataVencimento);
            vencimento.setHours(0, 0, 0, 0);
            
            parcelas.push({
              cliente_id: clienteId,
              tenant_id: tenantId,
              divida_id: dividaData.id,
              numero_parcela: parcelaNum++,
              valor_parcela: grupo.valor_parcela,
              data_vencimento: dataVencimento.toISOString().split('T')[0],
              status: vencimento < hoje ? 'atrasado' : 'pendente',
              grupo_descricao: grupo.descricao || `Grupo ${grupo.ordem}`,
            });
          }
        }

        const { error: parcelasError } = await supabase
          .from('cliente_parcelas')
          .insert(parcelas);

        if (parcelasError) throw parcelasError;

      } else {
        // Modo simples - parcelas uniformes
        const valorParcela = dados.valor_total / dados.numero_parcelas;
        
        const dataInicio = new Date(dados.data_inicio);
        const dataFinal = new Date(dataInicio);
        dataFinal.setMonth(dataFinal.getMonth() + dados.numero_parcelas - 1);

        // Criar divida
        const { data: dividaData, error: dividaError } = await supabase
          .from('cliente_dividas')
          .insert({
            cliente_id: clienteId,
            tenant_id: tenantId,
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

        // Buscar o maior numero_parcela existente para este cliente
        const { data: maxParcela } = await supabase
          .from('cliente_parcelas')
          .select('numero_parcela')
          .eq('cliente_id', clienteId)
          .order('numero_parcela', { ascending: false })
          .limit(1)
          .maybeSingle();

        const startingNumber = (maxParcela?.numero_parcela || 0) + 1;
        const parcelas = [];
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        for (let i = 0; i < dados.numero_parcelas; i++) {
          const dataVencimento = new Date(dataInicio);
          dataVencimento.setMonth(dataVencimento.getMonth() + i);
          
          const vencimento = new Date(dataVencimento);
          vencimento.setHours(0, 0, 0, 0);
          
          const status = vencimento < hoje ? 'atrasado' : 'pendente';

          parcelas.push({
            cliente_id: clienteId,
            tenant_id: tenantId,
            divida_id: dividaData.id,
            numero_parcela: startingNumber + i,
            valor_parcela: valorParcela,
            data_vencimento: dataVencimento.toISOString().split('T')[0],
            status: status,
          });
        }

        const { error: parcelasError } = await supabase
          .from('cliente_parcelas')
          .insert(parcelas);

        if (parcelasError) throw parcelasError;
      }
      
      await fetchDividas();
      return true;
    } catch (error) {
      console.error('Erro ao criar divida:', error);
      toast.error('Erro ao criar divida');
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
