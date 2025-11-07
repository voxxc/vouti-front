import { Task, KanbanColumn } from "@/types/project";

/**
 * Calcula o progresso do projeto baseado na posição das tasks nas colunas
 * 
 * Conceito: Colunas da esquerda (0%) -> direita (100%)
 * Cada coluna recebe um peso: (column_order / (total_colunas - 1)) * 100
 * Progresso = média dos pesos de todas as tasks
 * 
 * @param tasks - Lista de tasks do projeto
 * @param columns - Lista de colunas ordenadas
 * @returns Porcentagem de progresso (0-100)
 */
export const calculateProjectProgress = (
  tasks: Task[],
  columns: KanbanColumn[]
): number => {
  if (tasks.length === 0 || columns.length === 0) return 0;
  
  const totalColumns = columns.length;
  if (totalColumns === 1) return 0; // Projeto com 1 coluna = 0% sempre
  
  // Mapear column_id -> column_order
  const columnOrderMap = new Map<string, number>();
  columns.forEach(col => {
    columnOrderMap.set(col.id, col.columnOrder);
  });
  
  // Calcular progresso de cada task
  const taskProgressValues = tasks
    .filter(task => task.columnId && columnOrderMap.has(task.columnId))
    .map(task => {
      const order = columnOrderMap.get(task.columnId!) || 0;
      return (order / (totalColumns - 1)) * 100;
    });
  
  if (taskProgressValues.length === 0) return 0;
  
  // Média dos progressos
  const totalProgress = taskProgressValues.reduce((sum, val) => sum + val, 0);
  return Math.round(totalProgress / taskProgressValues.length);
};
