import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { checkIfUserIsAdmin } from '@/lib/auth-helpers';

export interface ReuniaoMetrics {
  totalReunioes: number;
  totalClientes: number;
  reunioesPorStatus: { status: string; count: number; cor: string }[];
  taxaConversao: number;
  mediaReunioesPorCliente: number;
  crescimentoMensal: { mes: string; total: number; fechados: number }[];
}

export interface UserMetrics extends ReuniaoMetrics {
  userId: string;
  userName: string;
}

export const useReuniaoMetrics = (
  userId?: string,
  startDate?: Date,
  endDate?: Date,
  statusIds?: string[]
) => {
  const [metrics, setMetrics] = useState<ReuniaoMetrics | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const admin = await checkIfUserIsAdmin(user.id);
      setIsAdmin(admin);

      const targetUserId = userId || user.id;

      // Base query
      let reunioesQuery = supabase
        .from('reunioes')
        .select(`
          id,
          user_id,
          cliente_id,
          status_id,
          created_at,
          data,
          reuniao_status (
            nome,
            cor
          ),
          profiles (
            full_name
          )
        `);

      // Filtrar por usuário se não for admin vendo todos
      if (!admin || userId) {
        reunioesQuery = reunioesQuery.eq('user_id', targetUserId);
      }

      // Filtrar por data
      if (startDate) {
        reunioesQuery = reunioesQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        reunioesQuery = reunioesQuery.lte('created_at', endDate.toISOString());
      }

      // Filtrar por status
      if (statusIds && statusIds.length > 0) {
        reunioesQuery = reunioesQuery.in('status_id', statusIds);
      }

      const { data: reunioes, error } = await reunioesQuery;
      if (error) throw error;

      // Buscar clientes únicos
      const clienteIds = [...new Set(reunioes?.map(r => r.cliente_id).filter(Boolean))];
      const totalClientes = clienteIds.length;

      // Calcular métricas por status
      const statusMap = new Map<string, { count: number; cor: string }>();
      reunioes?.forEach(r => {
        const statusNome = (r.reuniao_status as any)?.nome || 'Sem status';
        const statusCor = (r.reuniao_status as any)?.cor || '#6366f1';
        const current = statusMap.get(statusNome) || { count: 0, cor: statusCor };
        statusMap.set(statusNome, { count: current.count + 1, cor: statusCor });
      });

      const reunioesPorStatus = Array.from(statusMap.entries()).map(([status, data]) => ({
        status,
        count: data.count,
        cor: data.cor
      }));

      // Taxa de conversão (fechados / total)
      const fechados = reunioesPorStatus.find(r => r.status === 'fechado')?.count || 0;
      const taxaConversao = reunioes && reunioes.length > 0 
        ? (fechados / reunioes.length) * 100 
        : 0;

      // Média de reuniões por cliente
      const mediaReunioesPorCliente = totalClientes > 0 
        ? (reunioes?.length || 0) / totalClientes 
        : 0;

      // Crescimento mensal
      const monthlyMap = new Map<string, { total: number; fechados: number }>();
      reunioes?.forEach(r => {
        const date = new Date(r.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthlyMap.get(monthKey) || { total: 0, fechados: 0 };
        current.total++;
        if ((r.reuniao_status as any)?.nome === 'fechado') {
          current.fechados++;
        }
        monthlyMap.set(monthKey, current);
      });

      const crescimentoMensal = Array.from(monthlyMap.entries())
        .map(([mes, data]) => ({
          mes: new Date(mes + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
          total: data.total,
          fechados: data.fechados
        }))
        .sort((a, b) => a.mes.localeCompare(b.mes));

      setMetrics({
        totalReunioes: reunioes?.length || 0,
        totalClientes,
        reunioesPorStatus,
        taxaConversao,
        mediaReunioesPorCliente,
        crescimentoMensal
      });

      // Se for admin sem filtro de usuário, buscar métricas por usuário
      if (admin && !userId) {
        await fetchUserMetrics(startDate, endDate);
      }
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      toast.error('Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserMetrics = async (startDate?: Date, endDate?: Date) => {
    try {
      let query = supabase
        .from('reunioes')
        .select(`
          user_id,
          cliente_id,
          status_id,
          created_at,
          reuniao_status (
            nome,
            cor
          ),
          profiles (
            full_name
          )
        `);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data: reunioes, error } = await query;
      if (error) throw error;

      // Agrupar por usuário
      const userMap = new Map<string, any[]>();
      reunioes?.forEach(r => {
        const userId = r.user_id;
        if (!userMap.has(userId)) {
          userMap.set(userId, []);
        }
        userMap.get(userId)?.push(r);
      });

      const metrics: UserMetrics[] = Array.from(userMap.entries()).map(([userId, userReunioes]) => {
        const clienteIds = [...new Set(userReunioes.map(r => r.cliente_id).filter(Boolean))];
        const fechados = userReunioes.filter(r => (r.reuniao_status as any)?.nome === 'fechado').length;
        const taxaConversao = userReunioes.length > 0 ? (fechados / userReunioes.length) * 100 : 0;

        const statusMap = new Map<string, { count: number; cor: string }>();
        userReunioes.forEach(r => {
          const statusNome = (r.reuniao_status as any)?.nome || 'Sem status';
          const statusCor = (r.reuniao_status as any)?.cor || '#6366f1';
          const current = statusMap.get(statusNome) || { count: 0, cor: statusCor };
          statusMap.set(statusNome, { count: current.count + 1, cor: statusCor });
        });

        return {
          userId,
          userName: (userReunioes[0]?.profiles as any)?.full_name || 'Usuário',
          totalReunioes: userReunioes.length,
          totalClientes: clienteIds.length,
          reunioesPorStatus: Array.from(statusMap.entries()).map(([status, data]) => ({
            status,
            count: data.count,
            cor: data.cor
          })),
          taxaConversao,
          mediaReunioesPorCliente: clienteIds.length > 0 ? userReunioes.length / clienteIds.length : 0,
          crescimentoMensal: []
        };
      });

      setUserMetrics(metrics.sort((a, b) => b.totalReunioes - a.totalReunioes));
    } catch (error) {
      console.error('Erro ao buscar métricas por usuário:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [userId, startDate, endDate, statusIds]);

  return {
    metrics,
    userMetrics,
    loading,
    isAdmin,
    fetchMetrics
  };
};
