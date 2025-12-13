import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import type { 
  RelatorioConfig, 
  DadosRelatorio, 
  DadosEscritorio,
  DadosReceitas,
  DadosInadimplencia,
  DadosCustos,
  DadosColaboradores,
  ResumoFinanceiro,
  ClienteReceita,
  ClienteInadimplente,
  CustoItem,
  ColaboradorItem
} from '@/types/relatorio';

export function useRelatorioFinanceiro() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const gerarRelatorio = async (config: RelatorioConfig): Promise<DadosRelatorio | null> => {
    if (!tenant?.id) return null;
    
    setLoading(true);
    
    try {
      const inicio = config.periodo.inicio;
      const fim = config.periodo.fim;
      const inicioStr = inicio.toISOString().split('T')[0];
      const fimStr = fim.toISOString().split('T')[0];

      // Dados do escritorio
      const escritorio: DadosEscritorio = {
        nome: tenant.name || 'Escritorio',
        cnpj: (tenant as any).cnpj || null,
        endereco: (tenant as any).endereco || null,
        telefone: (tenant as any).telefone || null,
        email: (tenant as any).email_contato || null,
        responsavel: (tenant as any).responsavel_financeiro || null,
        logo_url: (tenant as any).logo_url || null,
      };

      // Buscar dados em paralelo
      const [clientesResult, parcelasResult, custosResult, colaboradoresResult, valesResult, categoriasResult] = await Promise.all([
        supabase.from('clientes').select('*').eq('tenant_id', tenant.id),
        supabase.from('cliente_parcelas').select('*').eq('tenant_id', tenant.id),
        supabase.from('custos').select('*, custo_categorias(nome, cor)').eq('tenant_id', tenant.id),
        supabase.from('colaboradores').select('*').eq('tenant_id', tenant.id).eq('status', 'ativo'),
        supabase.from('colaborador_vales').select('*').eq('tenant_id', tenant.id),
        supabase.from('custo_categorias').select('*').eq('tenant_id', tenant.id),
      ]);

      const clientes = clientesResult.data || [];
      const parcelas = parcelasResult.data || [];
      const custos = custosResult.data || [];
      const colaboradores = colaboradoresResult.data || [];
      const vales = valesResult.data || [];
      const categorias = categoriasResult.data || [];

      // Filtrar por periodo
      const parcelasPeriodo = parcelas.filter(p => {
        const dataVenc = parseISO(p.data_vencimento);
        return isWithinInterval(dataVenc, { start: inicio, end: fim });
      });

      const custosPeriodo = custos.filter(c => {
        const dataCusto = parseISO(c.data);
        return isWithinInterval(dataCusto, { start: inicio, end: fim });
      });

      const valesPeriodo = vales.filter(v => {
        const dataVale = parseISO(v.data);
        return isWithinInterval(dataVale, { start: inicio, end: fim });
      });

      // Calcular receitas
      const parcelasPagas = parcelasPeriodo.filter(p => p.status === 'pago');
      const parcelasPendentes = parcelasPeriodo.filter(p => p.status === 'pendente');
      const parcelasAtrasadas = parcelasPeriodo.filter(p => p.status === 'atrasado');

      const faturamentoTotal = parcelasPeriodo.reduce((sum, p) => sum + (p.valor_parcela || 0), 0);
      const honorariosPagos = parcelasPagas.reduce((sum, p) => sum + (p.valor_parcela || 0), 0);
      const honorariosPendentes = parcelasPendentes.reduce((sum, p) => sum + (p.valor_parcela || 0), 0);

      const clientesAtivos = clientes.filter(c => c.status_cliente === 'ativo');
      const clientesEncerrados = clientes.filter(c => c.status_cliente === 'encerrado');

      const clientesReceita: ClienteReceita[] = clientes.map(c => {
        const parcelasCliente = parcelas.filter(p => p.cliente_id === c.id);
        const valorRecebido = parcelasCliente.filter(p => p.status === 'pago').reduce((sum, p) => sum + (p.valor_parcela || 0), 0);
        const valorPendente = parcelasCliente.filter(p => p.status !== 'pago').reduce((sum, p) => sum + (p.valor_parcela || 0), 0);
        
        return {
          id: c.id,
          nome: c.nome_pessoa_fisica || c.nome_pessoa_juridica || 'Cliente',
          valorContrato: c.valor_contrato || 0,
          valorRecebido,
          valorPendente,
          dataFechamento: c.data_fechamento,
          status: c.status_cliente,
        };
      });

      const receitas: DadosReceitas = {
        faturamentoTotal,
        honorariosPagos,
        honorariosPendentes,
        contratosAtivos: clientesAtivos.length,
        contratosEncerrados: clientesEncerrados.length,
        clientes: clientesReceita,
      };

      // Calcular inadimplencia
      const totalInadimplente = parcelasAtrasadas.reduce((sum, p) => sum + (p.valor_parcela || 0), 0);
      const percentualInadimplencia = faturamentoTotal > 0 ? (totalInadimplente / faturamentoTotal) * 100 : 0;

      const clientesInadimplentesMap = new Map<string, ClienteInadimplente>();
      parcelasAtrasadas.forEach(p => {
        const cliente = clientes.find(c => c.id === p.cliente_id);
        if (!cliente) return;
        
        const existing = clientesInadimplentesMap.get(p.cliente_id);
        const diasAtraso = differenceInDays(new Date(), parseISO(p.data_vencimento));
        
        if (existing) {
          existing.valorEmAtraso += p.valor_parcela || 0;
          existing.parcelas += 1;
          existing.diasAtraso = Math.max(existing.diasAtraso, diasAtraso);
        } else {
          clientesInadimplentesMap.set(p.cliente_id, {
            id: p.cliente_id,
            nome: cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || 'Cliente',
            valorEmAtraso: p.valor_parcela || 0,
            diasAtraso,
            contrato: `Contrato ${cliente.id.slice(0, 8)}`,
            parcelas: 1,
          });
        }
      });

      const inadimplencia: DadosInadimplencia = {
        totalInadimplente,
        percentualInadimplencia,
        quantidadeClientes: clientesInadimplentesMap.size,
        quantidadeContratos: parcelasAtrasadas.length,
        clientes: Array.from(clientesInadimplentesMap.values()),
      };

      // Calcular custos
      const custosPorCategoria = new Map<string, { total: number; cor: string }>();
      const custosItens: CustoItem[] = custosPeriodo.map(c => {
        const categoriaNome = (c.custo_categorias as any)?.nome || c.tipo || 'Outros';
        const categoriaCor = (c.custo_categorias as any)?.cor || '#6b7280';
        
        const existing = custosPorCategoria.get(categoriaNome);
        if (existing) {
          existing.total += c.valor || 0;
        } else {
          custosPorCategoria.set(categoriaNome, { total: c.valor || 0, cor: categoriaCor });
        }
        
        return {
          id: c.id,
          descricao: c.descricao,
          categoria: categoriaNome,
          valor: c.valor || 0,
          data: c.data,
          tipo: c.tipo || 'variavel',
        };
      });

      const totalCustos = custosPeriodo.reduce((sum, c) => sum + (c.valor || 0), 0);
      const custosFixos = custosPeriodo.filter(c => c.recorrente).reduce((sum, c) => sum + (c.valor || 0), 0);
      const custosVariaveis = totalCustos - custosFixos;

      const custosData: DadosCustos = {
        totalOperacionais: totalCustos,
        totalFixos: custosFixos,
        totalVariaveis: custosVariaveis,
        totalCompras: custosPeriodo.filter(c => (c.custo_categorias as any)?.nome === 'Compras').reduce((sum, c) => sum + (c.valor || 0), 0),
        totalServicos: custosPeriodo.filter(c => (c.custo_categorias as any)?.nome === 'Servicos').reduce((sum, c) => sum + (c.valor || 0), 0),
        totalGeral: totalCustos,
        itens: custosItens,
        porCategoria: Array.from(custosPorCategoria.entries()).map(([categoria, data]) => ({
          categoria,
          total: data.total,
          cor: data.cor,
        })),
      };

      // Calcular colaboradores
      const totalSalarios = colaboradores.reduce((sum, c) => sum + (c.salario_base || 0), 0);
      const totalVales = valesPeriodo.reduce((sum, v) => sum + (v.valor || 0), 0);
      const totalColaboradores = totalSalarios + totalVales;
      const percentualFaturamento = faturamentoTotal > 0 ? (totalColaboradores / faturamentoTotal) * 100 : 0;

      const colaboradoresItens: ColaboradorItem[] = colaboradores.map(c => {
        const valesColaborador = valesPeriodo.filter(v => v.colaborador_id === c.id);
        const totalValesColaborador = valesColaborador.reduce((sum, v) => sum + (v.valor || 0), 0);
        
        return {
          id: c.id,
          nome: c.nome_completo,
          tipoVinculo: c.tipo_vinculo || 'CLT',
          salario: c.salario_base || 0,
          vales: totalValesColaborador,
          totalPago: (c.salario_base || 0) + totalValesColaborador,
        };
      });

      const colaboradoresData: DadosColaboradores = {
        totalSalarios,
        totalVales,
        totalGeral: totalColaboradores,
        percentualFaturamento,
        colaboradores: colaboradoresItens,
      };

      // Calcular resumo
      const receitaTotal = faturamentoTotal;
      const receitaRecebida = honorariosPagos;
      const despesaTotal = totalCustos + totalColaboradores;
      const resultado = receitaRecebida - despesaTotal;
      const tipo: 'lucro' | 'prejuizo' | 'neutro' = resultado > 0 ? 'lucro' : resultado < 0 ? 'prejuizo' : 'neutro';

      const resumo: ResumoFinanceiro = {
        receitaTotal,
        receitaRecebida,
        despesaTotal,
        resultado,
        tipo,
      };

      // Montar dados do relatorio
      const dados: DadosRelatorio = {
        escritorio,
        periodo: { inicio, fim },
        receitas,
        inadimplencia,
        custos: custosData,
        colaboradores: colaboradoresData,
        resumo,
        geradoEm: new Date(),
        geradoPor: user?.email || 'Usuario',
      };

      return dados;
    } catch (error) {
      console.error('Erro ao gerar relatorio:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const atualizarDadosEscritorio = async (dados: Partial<DadosEscritorio>) => {
    if (!tenant?.id) return false;

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          cnpj: dados.cnpj,
          endereco: dados.endereco,
          telefone: dados.telefone,
          email_contato: dados.email,
          responsavel_financeiro: dados.responsavel,
          logo_url: dados.logo_url,
        })
        .eq('id', tenant.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao atualizar dados do escritorio:', error);
      return false;
    }
  };

  return {
    gerarRelatorio,
    atualizarDadosEscritorio,
    loading,
  };
}
