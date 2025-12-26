import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ProcessoOAB, BuscaOABHistorico } from "@/types/busca-oab";

export const useBuscaOAB = () => {
  const { toast } = useToast();
  const [resultados, setResultados] = useState<ProcessoOAB[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [ultimaBusca, setUltimaBusca] = useState<Date | null>(null);
  const [historicoBuscas, setHistoricoBuscas] = useState<BuscaOABHistorico[]>([]);

  const buscarPorOAB = async (oabNumero: string, oabUf: string) => {
    console.log('[useBuscaOAB] 🔍 Iniciando busca:', { oabNumero, oabUf });
    setBuscando(true);
    setResultados([]);
    setUltimaBusca(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('judit-buscar-por-oab', {
        body: { oabNumero, oabUf }
      });

      console.log('[useBuscaOAB] 📥 Resposta:', { data, error });

      if (error) {
        console.error('[useBuscaOAB] ❌ Erro:', error);
        throw new Error(error.message || 'Erro ao buscar processos');
      }

      // Verificar se a resposta indica falha upstream
      if (data.success === false) {
        console.error('[useBuscaOAB] ⚠️ Erro upstream da Judit:', data);
        console.log('[useBuscaOAB] 📋 Tentativas:', data.attempts);
        
        toast({
          title: "Serviço temporariamente instável",
          description: `O serviço está retornando erro ${data.upstream_status}. Tentamos ${data.attempts?.length || 4} variações. Tente novamente em alguns minutos.`,
          variant: "destructive"
        });
        return;
      }

      setResultados(data.processos || []);
      setUltimaBusca(new Date());
      
      console.log('[useBuscaOAB] ✅ Busca concluída:', data.totalProcessos, 'processos');

      toast({
        title: "✅ Busca concluída!",
        description: `${data.totalProcessos} processo(s) encontrado(s) para OAB ${oabNumero}/${oabUf}`,
      });

      // Recarregar histórico
      await carregarHistorico();

    } catch (error: any) {
      console.error('[useBuscaOAB] 💥 Erro completo:', error);
      toast({
        title: "❌ Erro na busca",
        description: error.message || 'Não foi possível buscar os processos',
        variant: 'destructive'
      });
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  };

  const carregarHistorico = async () => {
    try {
      const { data, error } = await supabase
        .from('busca_processos_oab')
        .select('*')
        .order('data_busca', { ascending: false })
        .limit(10);

      if (error) throw error;

      setHistoricoBuscas(data || []);
    } catch (error) {
      console.error('[useBuscaOAB] Erro ao carregar histórico:', error);
    }
  };

  const carregarBuscaAnterior = (busca: BuscaOABHistorico) => {
    if (busca.resultado_completo?.lawsuits) {
      const processos = busca.resultado_completo.lawsuits.map((lawsuit: any) => ({
        numero_cnj: lawsuit.code,
        tribunal: lawsuit.tribunal_name || lawsuit.tribunal_acronym,
        tribunal_acronym: lawsuit.tribunal_acronym,
        parte_tipo: lawsuit.party_type || 'advogado',
        status_processual: lawsuit.status || 'em_andamento',
        fase_processual: lawsuit.phase,
        data_distribuicao: lawsuit.distribution_date,
        valor_causa: lawsuit.value,
        ultimos_andamentos: (lawsuit.steps || []).slice(-5).reverse().map((step: any) => ({
          data_movimentacao: step.date,
          tipo_movimentacao: step.type,
          descricao: step.description,
          dados_completos: step
        })),
        dados_completos: lawsuit
      }));

      setResultados(processos);
      setUltimaBusca(new Date(busca.data_busca));
      
      toast({
        title: "📂 Busca anterior carregada",
        description: `OAB ${busca.oab_numero}/${busca.oab_uf} - ${processos.length} processo(s)`,
      });
    }
  };

  return {
    buscarPorOAB,
    resultados,
    buscando,
    ultimaBusca,
    carregarHistorico,
    historicoBuscas,
    carregarBuscaAnterior
  };
};
