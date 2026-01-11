import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClienteAnalytics, ProfissaoData, IdadeData, RegiaoData } from '@/types/analytics';
import { differenceInYears } from 'date-fns';

function getFaixaEtaria(idade: number): string {
  if (idade <= 25) return '18-25';
  if (idade <= 35) return '26-35';
  if (idade <= 45) return '36-45';
  if (idade <= 55) return '46-55';
  if (idade <= 65) return '56-65';
  return '66+';
}

const fetchClienteAnalytics = async (): Promise<ClienteAnalytics> => {
  // Selecionar apenas colunas necessárias (otimização)
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, status_cliente, profissao, classificacao, data_nascimento, uf, valor_contrato, pessoas_adicionais');

  if (error) throw error;

  const totalClientes = clientes?.length || 0;
  const clientesAtivos = clientes?.filter(c => c.status_cliente === 'ativo').length || 0;
  const clientesInativos = clientes?.filter(c => c.status_cliente === 'inativo').length || 0;
  const clientesEncerrados = clientes?.filter(c => c.status_cliente === 'contrato_encerrado').length || 0;

  // === DISTRIBUIÇÃO POR PROFISSÕES ===
  const profissoesMap = new Map<string, number>();
  clientes?.forEach((cliente: any) => {
    if (cliente.profissao && cliente.classificacao === 'pf') {
      const profissao = cliente.profissao.trim();
      profissoesMap.set(profissao, (profissoesMap.get(profissao) || 0) + 1);
    }
    
    // Incluir pessoas adicionais
    if (Array.isArray(cliente.pessoas_adicionais)) {
      cliente.pessoas_adicionais.forEach((pessoa: any) => {
        if (pessoa.profissao) {
          const profissao = pessoa.profissao.trim();
          profissoesMap.set(profissao, (profissoesMap.get(profissao) || 0) + 1);
        }
      });
    }
  });

  const distribuicaoProfissoes: ProfissaoData[] = Array.from(profissoesMap.entries())
    .map(([profissao, count]) => ({
      profissao,
      count,
      percentage: totalClientes > 0 ? (count / totalClientes) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // === DISTRIBUIÇÃO POR FAIXA ETÁRIA ===
  const idadesMap = new Map<string, number>();
  clientes?.forEach((cliente: any) => {
    if (cliente.data_nascimento) {
      const idade = differenceInYears(new Date(), new Date(cliente.data_nascimento));
      const faixa = getFaixaEtaria(idade);
      idadesMap.set(faixa, (idadesMap.get(faixa) || 0) + 1);
    }
    
    // Incluir pessoas adicionais
    if (Array.isArray(cliente.pessoas_adicionais)) {
      cliente.pessoas_adicionais.forEach((pessoa: any) => {
        if (pessoa.data_nascimento) {
          const idade = differenceInYears(new Date(), new Date(pessoa.data_nascimento));
          const faixa = getFaixaEtaria(idade);
          idadesMap.set(faixa, (idadesMap.get(faixa) || 0) + 1);
        }
      });
    }
  });

  const distribuicaoIdades: IdadeData[] = Array.from(idadesMap.entries())
    .map(([faixaEtaria, count]) => ({
      faixaEtaria,
      count,
      percentage: totalClientes > 0 ? (count / totalClientes) * 100 : 0
    }))
    .sort((a, b) => {
      const ordem = ['18-25', '26-35', '36-45', '46-55', '56-65', '66+'];
      return ordem.indexOf(a.faixaEtaria) - ordem.indexOf(b.faixaEtaria);
    });

  // === DISTRIBUIÇÃO POR REGIÃO (UF) ===
  const regioesMap = new Map<string, number>();
  clientes?.forEach((cliente: any) => {
    if (cliente.uf) {
      const uf = cliente.uf.toUpperCase();
      regioesMap.set(uf, (regioesMap.get(uf) || 0) + 1);
    }
  });

  const distribuicaoRegioes: RegiaoData[] = Array.from(regioesMap.entries())
    .map(([uf, count]) => ({
      uf,
      count,
      percentage: totalClientes > 0 ? (count / totalClientes) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);

  // === VALOR TOTAL E TICKET MÉDIO ===
  const valorTotalContratos = clientes?.reduce((sum, c) => sum + (c.valor_contrato || 0), 0) || 0;
  const ticketMedio = totalClientes > 0 ? valorTotalContratos / totalClientes : 0;

  // === CLASSIFICAÇÃO PF/PJ ===
  const totalPF = clientes?.filter(c => c.classificacao === 'pf').length || 0;
  const totalPJ = clientes?.filter(c => c.classificacao === 'pj').length || 0;

  return {
    totalClientes,
    clientesAtivos,
    clientesInativos,
    clientesEncerrados,
    distribuicaoProfissoes,
    distribuicaoIdades,
    distribuicaoRegioes,
    distribuicaoClassificacao: [
      { tipo: 'pf', count: totalPF, percentage: totalClientes > 0 ? (totalPF / totalClientes) * 100 : 0 },
      { tipo: 'pj', count: totalPJ, percentage: totalClientes > 0 ? (totalPJ / totalClientes) * 100 : 0 }
    ],
    valorTotalContratos,
    ticketMedio
  };
};

export const useClienteAnalytics = () => {
  const { data: analytics, isLoading: loading, refetch } = useQuery({
    queryKey: ['cliente-analytics'],
    queryFn: fetchClienteAnalytics,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    gcTime: 10 * 60 * 1000, // 10 minutos no garbage collector
  });

  return {
    analytics: analytics ?? null,
    loading,
    refreshAnalytics: refetch,
  };
};
