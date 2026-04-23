/**
 * Canal de eventos global para mudanças em prazos.
 * Componentes que mantêm cache local de deadlines (ex: useAgendaData)
 * escutam este evento para aplicar atualização otimista + refetch.
 */
export type DeadlineChangeAction = "completed" | "reopened" | "deleted" | "updated";

export interface DeadlineChangeDetail {
  deadlineId: string;
  action: DeadlineChangeAction;
  completed?: boolean;
}

export const DEADLINE_CHANGE_EVENT = "deadline-completion-changed";

export function dispatchDeadlineChange(detail: DeadlineChangeDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DeadlineChangeDetail>(DEADLINE_CHANGE_EVENT, { detail }));
}