import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClienteAnalytics, ProfissaoData, IdadeData, RegiaoData, OrigemData, FaixaValorData } from '@/types/analytics';
import { differenceInYears } from 'date-fns';

function getFaixaEtaria(idade: number): string {
  if (idade <= 25) return '18-25';
  if (idade <= 35) return '26-35';
  if (idade <= 45) return '36-45';
  if (idade <= 55) return '46-55';
  if (idade <= 65) return '56-65';
  return '66+';
}

const ORIGEM_LABELS: Record<string, string> = {
  instagram_organico: 'Instagram Orgânico',
  instagram_trafego: 'Instagram Tráfego',
  facebook_organico: 'Facebook Orgânico',
  facebook_trafego: 'Facebook Tráfego',
  indicacao: 'Indicação',
  outro: 'Outro',
};

const FAIXAS_VALOR = [
  { faixa: 'Até R$ 1 mil', min: 0, max: 1000 },
  { faixa: 'R$ 1k - 3k', min: 1000, max: 3000 },
  { faixa: 'R$ 3k - 5k', min: 3000, max: 5000 },
  { faixa: 'R$ 5k - 10k', min: 5000, max: 10000 },
  { faixa: 'R$ 10k - 20k', min: 10000, max: 20000 },
  { faixa: 'R$ 20k - 50k', min: 20000, max: 50000 },
  { faixa: 'R$ 50k+', min: 50000, max: Infinity },
];

const fetchClienteAnalytics = async (): Promise<ClienteAnalytics> => {
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, status_cliente, profissao, classificacao, data_nascimento, uf, valor_contrato, pessoas_adicionais, origem_tipo');

  if (error) throw error;

  const totalClientes = clientes?.length || 0;
  const clientesAtivos = clientes?.filter(c => c.status_cliente === 'ativo').length || 0;
  const clientesInativos = clientes?.filter(c => c.status_cliente === 'inativo').length || 0;
  const clientesEncerrados = clientes?.filter(c => c.status_cliente === 'contrato_encerrado').length || 0;

  // === PROFISSÕES ===
  const profissoesMap = new Map<string, number>();
  clientes?.forEach((cliente: any) => {
    if (cliente.profissao && cliente.classificacao === 'pf') {
      const profissao = cliente.profissao.trim();
      profissoesMap.set(profissao, (profissoesMap.get(profissao) || 0) + 1);
    }
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

  // === FAIXA ETÁRIA ===
  const idadesMap = new Map<string, number>();
  clientes?.forEach((cliente: any) => {
    if (cliente.data_nascimento) {
      const idade = differenceInYears(new Date(), new Date(cliente.data_nascimento));
      const faixa = getFaixaEtaria(idade);
      idadesMap.set(faixa, (idadesMap.get(faixa) || 0) + 1);
    }
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

  // === REGIÕES ===
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

  // === VALORES ===
  const valorTotalContratos = clientes?.reduce((sum, c) => sum + (c.valor_contrato || 0), 0) || 0;
  const ticketMedio = totalClientes > 0 ? valorTotalContratos / totalClientes : 0;

  const valoresContratos = clientes?.map(c => c.valor_contrato).filter((v): v is number => v !== null && v > 0) || [];
  const menorContrato = valoresContratos.length > 0 ? Math.min(...valoresContratos) : 0;
  const maiorContrato = valoresContratos.length > 0 ? Math.max(...valoresContratos) : 0;

  // === PF/PJ ===
  const totalPF = clientes?.filter(c => c.classificacao === 'pf').length || 0;
  const totalPJ = clientes?.filter(c => c.classificacao === 'pj').length || 0;

  // === ORIGENS ===
  const origensMap = new Map<string, number>();
  clientes?.forEach((cliente: any) => {
    if (cliente.origem_tipo) {
      origensMap.set(cliente.origem_tipo, (origensMap.get(cliente.origem_tipo) || 0) + 1);
    }
  });

  const distribuicaoOrigens: OrigemData[] = Array.from(origensMap.entries())
    .map(([origem, count]) => ({
      origem,
      label: ORIGEM_LABELS[origem] || origem,
      count,
      percentage: totalClientes > 0 ? (count / totalClientes) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);

  // === FAIXAS DE VALOR ===
  const distribuicaoValores: FaixaValorData[] = FAIXAS_VALOR.map(({ faixa, min, max }) => {
    const count = valoresContratos.filter(v => v >= min && v < max).length;
    return {
      faixa,
      min,
      max,
      count,
      percentage: valoresContratos.length > 0 ? (count / valoresContratos.length) * 100 : 0
    };
  });

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
    distribuicaoOrigens,
    distribuicaoValores,
    valorTotalContratos,
    ticketMedio,
    menorContrato,
    maiorContrato,
  };
};

export const useClienteAnalytics = () => {
  const { data: analytics, isLoading: loading, refetch } = useQuery({
    queryKey: ['cliente-analytics'],
    queryFn: fetchClienteAnalytics,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    analytics: analytics ?? null,
    loading,
    refreshAnalytics: refetch,
  };
};
