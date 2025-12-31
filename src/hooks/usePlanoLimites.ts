import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PlanoConfig {
  codigo: string;
  nome: string;
  valor_mensal: number;
  limite_oabs: number | null;
  limite_usuarios: number | null;
  limite_processos_cadastrados: number | null;
  limite_processos_monitorados: number | null;
}

export interface PlanoLimites {
  oabs: number | null;
  usuarios: number | null;
  processos_cadastrados: number | null;
  processos_monitorados: number | null;
}

export interface UsoAtual {
  oabs: number;
  usuarios: number;
  processos_cadastrados: number;
  processos_monitorados: number;
}

export interface PorcentagemUso {
  oabs: number;
  usuarios: number;
  processos_cadastrados: number;
  processos_monitorados: number;
}

interface UsePlanoLimitesReturn {
  plano: string;
  planoConfig: PlanoConfig | null;
  limites: PlanoLimites;
  uso: UsoAtual;
  porcentagemUso: PorcentagemUso;
  loading: boolean;
  podeAdicionarOAB: () => boolean;
  podeAdicionarUsuario: () => boolean;
  podeCadastrarProcesso: () => boolean;
  podeMonitorarProcesso: () => boolean;
  refetch: () => Promise<void>;
}

export function usePlanoLimites(): UsePlanoLimitesReturn {
  const { tenantId } = useAuth();
  const [plano, setPlano] = useState<string>('solo');
  const [planoConfig, setPlanoConfig] = useState<PlanoConfig | null>(null);
  const [limiteOabsPersonalizado, setLimiteOabsPersonalizado] = useState<number | null>(null);
  const [uso, setUso] = useState<UsoAtual>({
    oabs: 0,
    usuarios: 0,
    processos_cadastrados: 0,
    processos_monitorados: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      // Buscar dados do tenant (plano e limite personalizado)
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('plano, limite_oabs_personalizado')
        .eq('id', tenantId)
        .single();

      if (tenantError) {
        console.error('Erro ao buscar tenant:', tenantError);
        setLoading(false);
        return;
      }

      const tenantPlano = tenantData?.plano || 'solo';
      setPlano(tenantPlano);
      setLimiteOabsPersonalizado(tenantData?.limite_oabs_personalizado || null);

      // Buscar configuração do plano
      const { data: configData, error: configError } = await supabase
        .from('planos_config')
        .select('codigo, nome, valor_mensal, limite_oabs, limite_usuarios, limite_processos_cadastrados, limite_processos_monitorados')
        .eq('codigo', tenantPlano)
        .single();

      if (configError) {
        console.error('Erro ao buscar config do plano:', configError);
      } else if (configData) {
        setPlanoConfig({
          codigo: configData.codigo,
          nome: configData.nome,
          valor_mensal: configData.valor_mensal,
          limite_oabs: configData.limite_oabs,
          limite_usuarios: configData.limite_usuarios,
          limite_processos_cadastrados: configData.limite_processos_cadastrados,
          limite_processos_monitorados: configData.limite_processos_monitorados,
        });
      }

      // Contar OABs cadastradas
      const oabsResult = await supabase
        .from('oabs_cadastradas')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // Contar usuários ativos
      const usuariosResult = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // Contar processos cadastrados (importados por CNJ)
      const processosResult = await supabase
        .from('processos_oab')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // Contar processos monitorados - usando count via data.length para evitar erro de tipo TS
      let monitoradosCount = 0;
      const monitoradosResult = await supabase
        .from('processo_monitoramento_judit' as any)
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('ativo', true);
      monitoradosCount = monitoradosResult.data?.length || 0;

      setUso({
        oabs: oabsResult.count || 0,
        usuarios: usuariosResult.count || 0,
        processos_cadastrados: processosResult.count || 0,
        processos_monitorados: monitoradosCount,
      });
    } catch (error) {
      console.error('Erro ao buscar dados de limites:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calcular limites efetivos (considerando personalização para Expansão/Enterprise)
  const limites: PlanoLimites = {
    oabs: 
      (plano === 'expansao' || plano === 'enterprise') && limiteOabsPersonalizado !== null
        ? limiteOabsPersonalizado
        : planoConfig?.limite_oabs ?? null,
    usuarios: planoConfig?.limite_usuarios ?? null,
    processos_cadastrados: planoConfig?.limite_processos_cadastrados ?? null,
    processos_monitorados: planoConfig?.limite_processos_monitorados ?? null,
  };

  // Calcular porcentagem de uso
  const calcularPorcentagem = (atual: number, limite: number | null): number => {
    if (limite === null) return 0; // Ilimitado
    if (limite === 0) return 100;
    return Math.min(100, Math.round((atual / limite) * 100));
  };

  const porcentagemUso: PorcentagemUso = {
    oabs: calcularPorcentagem(uso.oabs, limites.oabs),
    usuarios: calcularPorcentagem(uso.usuarios, limites.usuarios),
    processos_cadastrados: calcularPorcentagem(uso.processos_cadastrados, limites.processos_cadastrados),
    processos_monitorados: calcularPorcentagem(uso.processos_monitorados, limites.processos_monitorados),
  };

  // Funções de verificação
  const podeAdicionarOAB = useCallback((): boolean => {
    if (limites.oabs === null) return true; // Ilimitado
    return uso.oabs < limites.oabs;
  }, [limites.oabs, uso.oabs]);

  const podeAdicionarUsuario = useCallback((): boolean => {
    if (limites.usuarios === null) return true; // Ilimitado
    return uso.usuarios < limites.usuarios;
  }, [limites.usuarios, uso.usuarios]);

  const podeCadastrarProcesso = useCallback((): boolean => {
    if (limites.processos_cadastrados === null) return true; // Ilimitado
    return uso.processos_cadastrados < limites.processos_cadastrados;
  }, [limites.processos_cadastrados, uso.processos_cadastrados]);

  const podeMonitorarProcesso = useCallback((): boolean => {
    if (limites.processos_monitorados === null) return true; // Ilimitado
    return uso.processos_monitorados < limites.processos_monitorados;
  }, [limites.processos_monitorados, uso.processos_monitorados]);

  return {
    plano,
    planoConfig,
    limites,
    uso,
    porcentagemUso,
    loading,
    podeAdicionarOAB,
    podeAdicionarUsuario,
    podeCadastrarProcesso,
    podeMonitorarProcesso,
    refetch: fetchData,
  };
}
