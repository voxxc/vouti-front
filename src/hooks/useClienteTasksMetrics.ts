import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClienteTasksSummary {
  clienteNome: string;
  projectId: string;
  totalTasks: number;
  emAndamento: number;
  aguardando: number;
  concluidas: number;
  aFazer: number;
}

export interface ClienteTasksMetrics {
  totalClientes: number;
  clientesComTarefasAtivas: number;
  top5ClientesAtivos: ClienteTasksSummary[];
  distribuicaoGeral: {
    emAndamento: number;
    aguardando: number;
    concluidas: number;
    aFazer: number;
  };
}

const fetchClienteTasksMetrics = async (): Promise<ClienteTasksMetrics> => {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      id,
      status,
      project_id,
      projects (
        id,
        client,
        name
      )
    `);

  if (error) throw error;

  // Agrupar tarefas por projeto/cliente
  const clienteMap = new Map<string, ClienteTasksSummary>();

  tasks?.forEach((task: any) => {
    const projectId = task.project_id;
    const clienteNome = task.projects?.client || task.projects?.name || 'Cliente Desconhecido';

    if (!clienteMap.has(projectId)) {
      clienteMap.set(projectId, {
        clienteNome,
        projectId,
        totalTasks: 0,
        emAndamento: 0,
        aguardando: 0,
        concluidas: 0,
        aFazer: 0,
      });
    }

    const summary = clienteMap.get(projectId)!;
    summary.totalTasks++;

    switch (task.status) {
      case 'progress':
        summary.emAndamento++;
        break;
      case 'waiting':
        summary.aguardando++;
        break;
      case 'done':
        summary.concluidas++;
        break;
      case 'todo':
        summary.aFazer++;
        break;
    }
  });

  const clientesList = Array.from(clienteMap.values());
  
  // Calcular clientes com tarefas ativas (não concluídas)
  const clientesComTarefasAtivas = clientesList.filter(
    c => c.emAndamento + c.aguardando + c.aFazer > 0
  ).length;

  // Top 5 clientes com mais tarefas ativas
  const top5ClientesAtivos = clientesList
    .sort((a, b) => {
      const ativasA = a.emAndamento + a.aguardando + a.aFazer;
      const ativasB = b.emAndamento + b.aguardando + b.aFazer;
      return ativasB - ativasA;
    })
    .slice(0, 5);

  // Distribuição geral
  const distribuicaoGeral = {
    emAndamento: clientesList.reduce((sum, c) => sum + c.emAndamento, 0),
    aguardando: clientesList.reduce((sum, c) => sum + c.aguardando, 0),
    concluidas: clientesList.reduce((sum, c) => sum + c.concluidas, 0),
    aFazer: clientesList.reduce((sum, c) => sum + c.aFazer, 0),
  };

  return {
    totalClientes: clientesList.length,
    clientesComTarefasAtivas,
    top5ClientesAtivos,
    distribuicaoGeral,
  };
};

export const useClienteTasksMetrics = () => {
  const { data: metrics, isLoading: loading, refetch } = useQuery({
    queryKey: ['cliente-tasks-metrics'],
    queryFn: fetchClienteTasksMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    gcTime: 10 * 60 * 1000, // 10 minutos no garbage collector
  });

  return {
    metrics: metrics ?? null,
    loading,
    refreshMetrics: refetch,
  };
};
