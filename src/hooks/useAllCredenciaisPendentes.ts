import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CredencialPendenteComTenant {
  id: string;
  tenant_id: string;
  tenant_name: string;
  cpf: string;
  oab_numero: string | null;
  oab_uf: string | null;
  nome_advogado: string | null;
  created_at: string;
  status: string;
}

export function useAllCredenciaisPendentes() {
  const { data: credenciais, isLoading, refetch } = useQuery({
    queryKey: ['all-credenciais-pendentes'],
    queryFn: async () => {
      // Buscar todas as credenciais pendentes com info do tenant
      const { data, error } = await supabase
        .from('credenciais_cliente')
        .select(`
          id,
          tenant_id,
          cpf,
          status,
          created_at,
          oabs_cadastradas (
            oab_numero,
            oab_uf,
            nome_advogado
          )
        `)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar nomes dos tenants
      const tenantIds = [...new Set(data?.map(c => c.tenant_id) || [])];
      
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name')
        .in('id', tenantIds);

      const tenantMap = new Map(tenants?.map(t => [t.id, t.name]) || []);

      // Mapear credenciais com dados do tenant
      const credenciaisComTenant: CredencialPendenteComTenant[] = (data || []).map(c => ({
        id: c.id,
        tenant_id: c.tenant_id,
        tenant_name: tenantMap.get(c.tenant_id) || 'Desconhecido',
        cpf: c.cpf,
        status: c.status || 'pendente',
        created_at: c.created_at || '',
        oab_numero: c.oabs_cadastradas?.oab_numero || null,
        oab_uf: c.oabs_cadastradas?.oab_uf || null,
        nome_advogado: c.oabs_cadastradas?.nome_advogado || null,
      }));

      return credenciaisComTenant;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Agrupar por tenant
  const credenciaisAgrupadas = (credenciais || []).reduce((acc, cred) => {
    if (!acc[cred.tenant_id]) {
      acc[cred.tenant_id] = {
        tenant_id: cred.tenant_id,
        tenant_name: cred.tenant_name,
        credenciais: [],
      };
    }
    acc[cred.tenant_id].credenciais.push(cred);
    return acc;
  }, {} as Record<string, { tenant_id: string; tenant_name: string; credenciais: CredencialPendenteComTenant[] }>);

  return {
    credenciais: credenciais || [],
    credenciaisAgrupadas: Object.values(credenciaisAgrupadas),
    totalPendentes: credenciais?.length || 0,
    isLoading,
    refetch,
  };
}
