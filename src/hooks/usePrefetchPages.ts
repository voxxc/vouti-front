import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/hooks/useTenantId';
import { checkIfUserIsAdminOrController } from '@/lib/auth-helpers';
import { fetchAllPaginated } from '@/lib/supabasePagination';

// Cache key compartilhada com useAndamentosNaoLidosGlobal para hidratação instantânea
export const ANDAMENTOS_NAO_LIDOS_SNAPSHOT_KEY = 'controladoria_andamentos_nao_lidos_v1';
const SNAPSHOT_TTL_MS = 5 * 60 * 1000;

interface AndamentosNaoLidosSnapshot {
  tenantId: string;
  totalNaoLidos: number;
  processos: any[];
  oabs: { id: string; label: string }[];
  lastUpdated: number;
}

const saveAndamentosSnapshot = (snapshot: AndamentosNaoLidosSnapshot) => {
  try {
    localStorage.setItem(ANDAMENTOS_NAO_LIDOS_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (e) {
    // ignore quota errors
  }
};

export const readAndamentosSnapshot = (
  tenantId: string
): AndamentosNaoLidosSnapshot | null => {
  try {
    const raw = localStorage.getItem(ANDAMENTOS_NAO_LIDOS_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AndamentosNaoLidosSnapshot;
    if (parsed.tenantId !== tenantId) return null;
    return parsed;
  } catch {
    return null;
  }
};

const isSnapshotFresh = (snapshot: AndamentosNaoLidosSnapshot | null) => {
  if (!snapshot) return false;
  return Date.now() - snapshot.lastUpdated < SNAPSHOT_TTL_MS;
};

/**
 * Prefetch silencioso da Central da Controladoria: roda as mesmas queries
 * de `useAndamentosNaoLidosGlobal` e persiste um snapshot em localStorage
 * para que a página abra com a tela pronta.
 */
export const prefetchControladoriaListasSilent = async (tenantId: string | null) => {
  if (!tenantId) return;

  const existing = readAndamentosSnapshot(tenantId);
  if (isSnapshotFresh(existing)) return;

  try {
    const [processosResult, naoLidosResult] = await Promise.all([
      fetchAllPaginated<any>(() =>
        supabase
          .from('processos_oab')
          .select(`
            id,
            numero_cnj,
            parte_ativa,
            parte_passiva,
            tribunal_sigla,
            monitoramento_ativo,
            oab_id,
            capa_completa,
            oabs_cadastradas!inner(
              id,
              oab_numero,
              oab_uf,
              nome_advogado
            )
          `)
          .eq('tenant_id', tenantId)
          .order('id') as any
      ),
      supabase.rpc('get_andamentos_nao_lidos_por_processo', { p_tenant_id: tenantId }),
    ]);

    if (processosResult.error || naoLidosResult.error) return;

    const naoLidosMap = new Map<string, { nao_lidos: number; ultima_movimentacao: string | null }>();
    (naoLidosResult.data || []).forEach((row: any) => {
      naoLidosMap.set(row.processo_oab_id, {
        nao_lidos: row.nao_lidos,
        ultima_movimentacao: row.ultima_movimentacao,
      });
    });

    const oabsMap = new Map<string, { id: string; label: string }>();
    const processos = (processosResult.data || [])
      .map((p: any) => {
        const oabData = p.oabs_cadastradas;
        if (oabData && !oabsMap.has(oabData.id)) {
          oabsMap.set(oabData.id, {
            id: oabData.id,
            label: `${oabData.nome_advogado || 'Advogado'} (${oabData.oab_numero}/${oabData.oab_uf})`,
          });
        }
        const info = naoLidosMap.get(p.id);
        return {
          id: p.id,
          numero_cnj: p.numero_cnj,
          parte_ativa: p.parte_ativa,
          parte_passiva: p.parte_passiva,
          tribunal_sigla: p.tribunal_sigla,
          monitoramento_ativo: p.monitoramento_ativo,
          oab_id: p.oab_id,
          capa_completa: p.capa_completa,
          andamentos_nao_lidos: info?.nao_lidos || 0,
          ultima_movimentacao: info?.ultima_movimentacao || null,
          oab: oabData
            ? {
                id: oabData.id,
                oab_numero: oabData.oab_numero,
                oab_uf: oabData.oab_uf,
                nome_advogado: oabData.nome_advogado,
              }
            : null,
        };
      })
      .filter((p: any) => p.andamentos_nao_lidos > 0 && p.oab)
      .sort((a: any, b: any) => {
        const da = a.ultima_movimentacao ? new Date(a.ultima_movimentacao).getTime() : 0;
        const db = b.ultima_movimentacao ? new Date(b.ultima_movimentacao).getTime() : 0;
        return db - da;
      });

    const totalNaoLidos = processos.reduce((acc, p) => acc + p.andamentos_nao_lidos, 0);

    saveAndamentosSnapshot({
      tenantId,
      totalNaoLidos,
      processos,
      oabs: Array.from(oabsMap.values()),
      lastUpdated: Date.now(),
    });

    console.log('[Prefetch] Snapshot Andamentos Não Lidos salvo:', processos.length, 'processos');
  } catch (e) {
    console.warn('[Prefetch] Falha no prefetch silencioso da Controladoria:', e);
  }
};

// Prefetch Dashboard data
const prefetchDashboardData = async (
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  userId: string
) => {
  // Prefetch system users
  await queryClient.prefetchQuery({
    queryKey: ['system-users', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_users_with_roles_by_tenant', {
        target_tenant_id: tenantId
      });
      if (error) throw error;
      return (data || []).map((user: any) => ({
        id: user.user_id,
        email: user.email,
        name: user.full_name || user.email,
        avatar: user.avatar_url,
        role: user.highest_role,
        personalInfo: {},
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
      }));
    },
    staleTime: 5 * 60 * 1000
  });

  // Prefetch admin metrics (only for admin)
  await queryClient.prefetchQuery({
    queryKey: ['admin-metrics', userId],
    queryFn: async () => {
      const [projectsRes, leadsRes, processosRes, deadlinesRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('module', 'legal'),
        supabase.from('reuniao_clientes').select('id', { count: 'exact', head: true }),
        supabase.from('processos_oab').select('id', { count: 'exact', head: true }),
        supabase.from('deadlines').select('id', { count: 'exact', head: true }).eq('completed', false)
      ]);

      return {
        totalProjects: projectsRes.count || 0,
        totalLeads: leadsRes.count || 0,
        totalProcessos: processosRes.count || 0,
        pendingDeadlines: deadlinesRes.count || 0
      };
    },
    staleTime: 5 * 60 * 1000
  });
};

// Prefetch Projects data
const prefetchProjectsData = async (
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  tenantId: string | null
) => {
  await queryClient.prefetchQuery({
    queryKey: ['projects-basic', userId, tenantId],
    queryFn: async () => {
      const hasFullAccess = await checkIfUserIsAdminOrController(userId);
      
      let query = supabase
        .from('projects')
        .select(`
          id,
          name,
          client,
          cliente_id,
          description,
          created_by,
          created_at,
          updated_at,
          tasks(count)
        `)
        .order('name', { ascending: true });

      if (!hasFullAccess) {
        const { data: collaboratorProjects } = await supabase
          .from('project_collaborators')
          .select('project_id')
          .eq('user_id', userId);

        const collaboratorProjectIds = collaboratorProjects?.map(cp => cp.project_id) || [];
        
        query = query.or(`created_by.eq.${userId}${collaboratorProjectIds.length > 0 ? `,id.in.(${collaboratorProjectIds.join(',')})` : ''}`);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(project => ({
        id: project.id,
        name: project.name,
        client: project.client,
        clienteId: project.cliente_id,
        description: project.description || '',
        createdBy: project.created_by,
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
        taskCount: (project.tasks as any)?.[0]?.count || 0
      }));
    },
    staleTime: 5 * 60 * 1000
  });
};

// Prefetch Controladoria data
const prefetchControladoriaDataInternal = async (
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string | null
) => {
  await queryClient.prefetchQuery({
    queryKey: ['controladoria-metrics', tenantId],
    queryFn: async () => {
      const [processosRes, oabsRes, pushDocsRes] = await Promise.all([
        supabase.from('processos_oab').select('id', { count: 'exact', head: true }),
        supabase.from('oabs_cadastradas').select('id'),
        supabase.from('push_docs_cadastrados').select('id', { count: 'exact', head: true }).neq('tracking_status', 'deletado')
      ]);

      return {
        totalProcessos: processosRes.count || 0,
        totalOABs: oabsRes.data?.length || 0,
        totalPushDocs: pushDocsRes.count || 0
      };
    },
    staleTime: 5 * 60 * 1000
  });
};

// Prefetch Agenda data
const prefetchAgendaData = async (
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string | null
) => {
  await queryClient.prefetchQuery({
    queryKey: ['deadlines-list', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deadlines')
        .select('id, title, date, completed, description, project_id')
        .order('date', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000
  });
};

// Prefetch CRM/Clientes data
const prefetchCRMData = async (
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string | null
) => {
  await queryClient.prefetchQuery({
    queryKey: ['clientes-list', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome_pessoa_fisica, nome_pessoa_juridica, status_cliente, valor_contrato')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 3 * 60 * 1000
  });
};

// Prefetch Financial data
const prefetchFinancialData = async (
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string | null
) => {
  await queryClient.prefetchQuery({
    queryKey: ['financial-summary', tenantId],
    queryFn: async () => {
      const [parcelasRes, custosRes, colaboradoresRes] = await Promise.all([
        supabase.from('cliente_parcelas').select('id, status, valor_parcela', { count: 'exact' }).limit(100),
        supabase.from('custos').select('id, valor, status', { count: 'exact' }).limit(50),
        supabase.from('colaboradores').select('id, nome_completo, salario_base', { count: 'exact' }).limit(50)
      ]);
      
      return {
        parcelas: parcelasRes.data || [],
        custos: custosRes.data || [],
        colaboradores: colaboradoresRes.data || []
      };
    },
    staleTime: 3 * 60 * 1000
  });
};

// Prefetch Reuniões data
const prefetchReunioesData = async (
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string | null
) => {
  await queryClient.prefetchQuery({
    queryKey: ['reunioes-list', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reunioes')
        .select('id, titulo, data, horario, status, cliente_id')
        .order('data', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000
  });
};

// Hook para prefetch com acesso ao contexto
export const usePrefetchPages = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenantId } = useTenantId();

  const prefetchDashboard = useCallback(async () => {
    if (!user?.id || !tenantId) return;
    
    // Verificar se já existe no cache e não está stale
    const cachedData = queryClient.getQueryData(['system-users', tenantId]);
    if (cachedData) return;
    
    console.log('[Prefetch] Dashboard iniciado');
    await prefetchDashboardData(queryClient, tenantId, user.id);
  }, [queryClient, user?.id, tenantId]);

  const prefetchProjects = useCallback(async () => {
    if (!user?.id) return;
    
    const cachedData = queryClient.getQueryData(['projects-basic', user.id, tenantId]);
    if (cachedData) return;
    
    console.log('[Prefetch] Projects iniciado');
    await prefetchProjectsData(queryClient, user.id, tenantId);
  }, [queryClient, user?.id, tenantId]);

  const prefetchControladoria = useCallback(async () => {
    const cachedData = queryClient.getQueryData(['controladoria-metrics', tenantId]);
    if (cachedData) return;
    
    console.log('[Prefetch] Controladoria iniciado');
    await prefetchControladoriaDataInternal(queryClient, tenantId);
  }, [queryClient, tenantId]);

  const prefetchAgenda = useCallback(async () => {
    const cachedData = queryClient.getQueryData(['deadlines-list', tenantId]);
    if (cachedData) return;
    
    console.log('[Prefetch] Agenda iniciado');
    await prefetchAgendaData(queryClient, tenantId);
  }, [queryClient, tenantId]);

  const prefetchCRM = useCallback(async () => {
    const cachedData = queryClient.getQueryData(['clientes-list', tenantId]);
    if (cachedData) return;
    
    console.log('[Prefetch] CRM iniciado');
    await prefetchCRMData(queryClient, tenantId);
  }, [queryClient, tenantId]);

  const prefetchFinancial = useCallback(async () => {
    const cachedData = queryClient.getQueryData(['financial-summary', tenantId]);
    if (cachedData) return;
    
    console.log('[Prefetch] Financial iniciado');
    await prefetchFinancialData(queryClient, tenantId);
  }, [queryClient, tenantId]);

  const prefetchReunioes = useCallback(async () => {
    const cachedData = queryClient.getQueryData(['reunioes-list', tenantId]);
    if (cachedData) return;
    
    console.log('[Prefetch] Reuniões iniciado');
    await prefetchReunioesData(queryClient, tenantId);
  }, [queryClient, tenantId]);

  const prefetchAll = useCallback(async () => {
    await Promise.all([
      prefetchDashboard(),
      prefetchProjects(),
      prefetchControladoria(),
      prefetchAgenda(),
      prefetchCRM(),
      prefetchFinancial(),
      prefetchReunioes()
    ]);
  }, [prefetchDashboard, prefetchProjects, prefetchControladoria, prefetchAgenda, prefetchCRM, prefetchFinancial, prefetchReunioes]);

  return {
    prefetchDashboard,
    prefetchProjects,
    prefetchControladoria,
    prefetchAgenda,
    prefetchCRM,
    prefetchFinancial,
    prefetchReunioes,
    prefetchAll
  };
};

// Função standalone para chamar após login (sem hooks)
export const prefetchAllPagesAfterLogin = async (
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  userId: string
) => {
  console.log('[Prefetch] Iniciando prefetch pós-login...');
  
  await Promise.all([
    prefetchDashboardData(queryClient, tenantId, userId),
    prefetchProjectsData(queryClient, userId, tenantId),
    prefetchControladoriaDataInternal(queryClient, tenantId)
  ]);
  
  console.log('[Prefetch] Prefetch pós-login concluído');
};
