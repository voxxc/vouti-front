import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ColaboradorPagamento, Colaborador } from '@/types/financeiro';
import { useTenantId } from './useTenantId';
import { toast } from '@/hooks/use-toast';
import { format, startOfMonth, addMonths } from 'date-fns';

export const useColaboradorPagamentos = () => {
  const [pagamentos, setPagamentos] = useState<ColaboradorPagamento[]>([]);
  const [loading, setLoading] = useState(false);
  const { tenantId } = useTenantId();

  const fetchPagamentosColaborador = async (colaboradorId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('colaborador_pagamentos')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .order('mes_referencia', { ascending: false });

      if (error) throw error;
      setPagamentos((data || []) as ColaboradorPagamento[]);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar pagamentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPagamentosMes = async (mesReferencia: Date) => {
    setLoading(true);
    try {
      const mesFormatado = format(startOfMonth(mesReferencia), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('colaborador_pagamentos')
        .select(`
          *,
          colaborador:colaboradores(*)
        `)
        .eq('mes_referencia', mesFormatado)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      setPagamentos((data || []) as ColaboradorPagamento[]);
      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar folha',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const gerarPagamentoMensal = async (colaborador: Colaborador, mesReferencia: Date) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      const mesFormatado = format(startOfMonth(mesReferencia), 'yyyy-MM-dd');
      
      // Verificar se ja existe pagamento para este mes
      const { data: existente } = await supabase
        .from('colaborador_pagamentos')
        .select('id')
        .eq('colaborador_id', colaborador.id)
        .eq('mes_referencia', mesFormatado)
        .single();

      if (existente) {
        toast({
          title: 'Pagamento ja existe',
          description: 'Ja existe um pagamento gerado para este mes',
          variant: 'destructive',
        });
        return null;
      }

      // Buscar vales pendentes para desconto
      const { data: vales } = await supabase
        .from('colaborador_vales')
        .select('*')
        .eq('colaborador_id', colaborador.id)
        .eq('status', 'pendente')
        .eq('vincular_salario', true);

      let descontos = 0;
      let acrescimos = 0;

      (vales || []).forEach(vale => {
        if (vale.tipo === 'reembolso') {
          acrescimos += Number(vale.valor);
        } else {
          descontos += Number(vale.valor);
        }
      });

      const valorLiquido = colaborador.salario_base - descontos + acrescimos;

      // Calcular data de vencimento baseado no dia_pagamento
      const diaPagamento = colaborador.dia_pagamento || 5;
      const dataVencimento = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth(), diaPagamento);
      
      // Se o dia de pagamento ja passou este mes, usar proximo mes
      if (dataVencimento < new Date()) {
        dataVencimento.setMonth(dataVencimento.getMonth() + 1);
      }

      const { data, error } = await supabase
        .from('colaborador_pagamentos')
        .insert({
          colaborador_id: colaborador.id,
          tenant_id: tenantId,
          mes_referencia: mesFormatado,
          salario_base: colaborador.salario_base,
          descontos,
          acrescimos,
          valor_liquido: valorLiquido,
          data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
          status: 'pendente',
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Pagamento gerado',
        description: `Pagamento de ${colaborador.nome_completo} gerado com sucesso`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar pagamento',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const gerarFolhaMes = async (colaboradores: Colaborador[], mesReferencia: Date) => {
    setLoading(true);
    try {
      let gerados = 0;
      let existentes = 0;

      for (const colaborador of colaboradores.filter(c => c.status === 'ativo')) {
        const resultado = await gerarPagamentoMensal(colaborador, mesReferencia);
        if (resultado) {
          gerados++;
        } else {
          existentes++;
        }
      }

      toast({
        title: 'Folha gerada',
        description: `${gerados} pagamentos gerados. ${existentes} ja existiam.`,
      });

      await fetchPagamentosMes(mesReferencia);
    } finally {
      setLoading(false);
    }
  };

  const darBaixaPagamento = async (
    pagamentoId: string, 
    dados: {
      data_pagamento: string;
      metodo_pagamento: string;
      observacoes?: string;
    }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      // Atualizar pagamento
      const { error } = await supabase
        .from('colaborador_pagamentos')
        .update({
          data_pagamento: dados.data_pagamento,
          metodo_pagamento: dados.metodo_pagamento,
          observacoes: dados.observacoes,
          status: 'pago',
          user_id: user.id,
        })
        .eq('id', pagamentoId);

      if (error) throw error;

      // Buscar pagamento para pegar colaborador_id
      const { data: pagamento } = await supabase
        .from('colaborador_pagamentos')
        .select('colaborador_id')
        .eq('id', pagamentoId)
        .single();

      if (pagamento) {
        // Marcar vales pendentes como descontados
        await supabase
          .from('colaborador_vales')
          .update({ status: 'descontado' })
          .eq('colaborador_id', pagamento.colaborador_id)
          .eq('status', 'pendente')
          .eq('vincular_salario', true);
      }

      toast({
        title: 'Baixa realizada',
        description: 'Pagamento registrado com sucesso',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao dar baixa',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const atualizarStatusAtrasados = async () => {
    const hoje = new Date().toISOString().split('T')[0];
    
    await supabase
      .from('colaborador_pagamentos')
      .update({ status: 'atrasado' })
      .eq('status', 'pendente')
      .lt('data_vencimento', hoje);
  };

  return {
    pagamentos,
    loading,
    fetchPagamentosColaborador,
    fetchPagamentosMes,
    gerarPagamentoMensal,
    gerarFolhaMes,
    darBaixaPagamento,
    atualizarStatusAtrasados,
  };
};
