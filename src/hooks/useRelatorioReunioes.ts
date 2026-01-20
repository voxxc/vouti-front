import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  RelatorioReunioesConfig, 
  DadosRelatorioReunioes,
  LeadRelatorio,
  ReuniaoRelatorio,
  PerformanceUsuarioRelatorio 
} from '@/types/relatorioReunioes';

export const useRelatorioReunioes = () => {
  const [loading, setLoading] = useState(false);

  const gerarRelatorio = async (config: RelatorioReunioesConfig): Promise<DadosRelatorioReunioes | null> => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      // Buscar perfil do usuario com tenant_id ANTES de qualquer outra query
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tenant_id) {
        toast.error('Tenant não encontrado para o usuário');
        throw new Error('Tenant não encontrado');
      }

      const tenantId = profile.tenant_id;
      console.log('[Relatório] TenantId:', tenantId);

      // Buscar dados do escritorio (tenant)
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, cnpj, endereco, telefone, email_contato, responsavel_financeiro')
        .eq('id', tenantId)
        .single();

      // Ajustar datas para incluir todo o período corretamente
      const dataInicio = config.periodo.inicio.toISOString();
      const dataFim = new Date(config.periodo.fim);
      dataFim.setHours(23, 59, 59, 999);
      const dataFimISO = dataFim.toISOString();
      
      console.log('[Relatório] Período:', dataInicio, 'até', dataFimISO);

      // Buscar leads no periodo (de reuniao_clientes - leads criados via agendamento)
      const { data: leadsData } = await supabase
        .from('reuniao_clientes')
        .select(`
          id,
          nome,
          email,
          telefone,
          observacoes,
          origem,
          created_at,
          created_by,
          profiles:created_by (full_name)
        `)
        .gte('created_at', dataInicio)
        .lte('created_at', dataFimISO)
        .eq('tenant_id', tenantId);

      console.log('[Relatório] Leads encontrados:', leadsData?.length || 0);

      const leads: LeadRelatorio[] = (leadsData || []).map(lead => ({
        id: lead.id,
        nome: lead.nome,
        email: lead.email,
        telefone: lead.telefone,
        origem: lead.origem || null,
        status: null, // Calculado baseado nas reunioes
        dataCadastro: lead.created_at,
        responsavel: (lead.profiles as any)?.full_name || null,
        observacoes: lead.observacoes || null
      }));

      // Calcular novos leads (ultimos 7 dias do periodo)
      const seteDiasAntes = new Date(config.periodo.fim);
      seteDiasAntes.setDate(seteDiasAntes.getDate() - 7);
      const novosLeads = leads.filter(l => new Date(l.dataCadastro) >= seteDiasAntes).length;

      // Buscar reunioes no periodo
      const { data: reunioesData } = await supabase
        .from('reunioes')
        .select(`
          id,
          data,
          observacoes,
          user_id,
          reuniao_clientes (nome),
          reuniao_status (nome),
          profiles:user_id (full_name)
        `)
        .gte('created_at', dataInicio)
        .lte('created_at', dataFimISO)
        .eq('tenant_id', tenantId);

      console.log('[Relatório] Reuniões encontradas:', reunioesData?.length || 0);

      const reunioes: ReuniaoRelatorio[] = (reunioesData || []).map(r => ({
        id: r.id,
        data: r.data,
        cliente: (r.reuniao_clientes as any)?.nome || 'Cliente nao informado',
        usuario: (r.profiles as any)?.full_name || 'Usuario',
        status: (r.reuniao_status as any)?.nome || 'Sem status',
        resultado: (r.reuniao_status as any)?.nome || null,
        observacoes: r.observacoes
      }));

      // Calcular metricas
      const reunioesFechadas = reunioes.filter(r => r.status.toLowerCase() === 'fechado').length;
      const taxaConversao = reunioes.length > 0 ? (reunioesFechadas / reunioes.length) * 100 : 0;

      // Calcular performance por usuario
      const userMap = new Map<string, { userId: string; userName: string; total: number; fechadas: number }>();
      reunioesData?.forEach(r => {
        const userId = r.user_id;
        const userName = (r.profiles as any)?.full_name || 'Usuario';
        const current = userMap.get(userId) || { userId, userName, total: 0, fechadas: 0 };
        current.total++;
        if ((r.reuniao_status as any)?.nome?.toLowerCase() === 'fechado') {
          current.fechadas++;
        }
        userMap.set(userId, current);
      });

      const performanceUsuarios: PerformanceUsuarioRelatorio[] = Array.from(userMap.values()).map(u => ({
        userId: u.userId,
        userName: u.userName,
        reunioesAgendadas: u.total,
        reunioesFechadas: u.fechadas,
        taxaConversao: u.total > 0 ? (u.fechadas / u.total) * 100 : 0
      })).sort((a, b) => b.reunioesAgendadas - a.reunioesAgendadas);

      return {
        escritorio: {
          nome: tenant?.name || 'Escritorio',
          cnpj: tenant?.cnpj || null,
          endereco: tenant?.endereco || null,
          telefone: tenant?.telefone || null,
          email: tenant?.email_contato || null,
          responsavel: tenant?.responsavel_financeiro || null
        },
        periodo: config.periodo,
        resumo: {
          totalLeads: leads.length,
          novosLeads,
          totalReunioes: reunioes.length,
          reunioesFechadas,
          taxaConversao
        },
        leads,
        reunioes,
        performanceUsuarios,
        geradoPor: profile?.full_name || 'Usuario',
        dataGeracao: new Date()
      };
    } catch (error) {
      console.error('Erro ao gerar relatorio:', error);
      toast.error('Erro ao gerar relatorio');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { gerarRelatorio, loading };
};
