import { useState, useMemo } from "react";
import { PlanejadorTask, KanbanColumn, KANBAN_COLUMNS, categorizeTask } from "@/hooks/usePlanejadorTasks";
import { PlanejadorLabel, PlanejadorLabelAssignment } from "@/hooks/usePlanejadorLabels";
import { ColumnConfig } from "./PlanejadorSettings";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";

interface PlanejadorListViewProps {
  tasksByColumn: Record<KanbanColumn, PlanejadorTask[]>;
  onTaskClick: (task: PlanejadorTask) => void;
  onMoveTask: (taskId: string, updates: Partial<PlanejadorTask>) => void;
  searchQuery: string;
  columnConfig?: ColumnConfig[];
  selectedUserId?: string | null;
  selectedLabelIds?: string[];
  labels?: PlanejadorLabel[];
  allLabelAssignments?: PlanejadorLabelAssignment[];
  participantTaskIds?: string[];
}

export function PlanejadorListView({
  tasksByColumn,
  onTaskClick,
  onMoveTask,
  searchQuery,
  columnConfig,
  selectedUserId,
  selectedLabelIds = [],
  labels = [],
  allLabelAssignments = [],
  participantTaskIds,
}: PlanejadorListViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { tenantId } = useTenantId();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [bulkAction, setBulkAction] = useState<string>("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["tenant-profiles", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("tenant_id", tenantId);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.user_id, p.full_name])),
    [profiles]
  );

  // Flatten tasks with column info
  const allTasks = useMemo(() => {
    const result: (PlanejadorTask & { columnId: KanbanColumn; columnLabel: string; columnColor: string })[] = [];
    const colMap = new Map(KANBAN_COLUMNS.map((c) => [c.id, c]));

    for (const [colId, tasks] of Object.entries(tasksByColumn)) {
      const col = colMap.get(colId as KanbanColumn);
      if (!col) continue;
      for (const task of tasks) {
        result.push({
          ...task,
          columnId: colId as KanbanColumn,
          columnLabel: col.label,
          columnColor: col.color,
        });
      }
    }
    return result;
  }, [tasksByColumn]);

  // Apply same filters as Kanban
  const filteredTasks = useMemo(() => {
    let filtered = allTasks;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => t.titulo.toLowerCase().includes(q));
    }

    if (selectedUserId) {
      filtered = filtered.filter(
        (t) =>
          t.proprietario_id === selectedUserId ||
          t.responsavel_id === selectedUserId ||
          (participantTaskIds && participantTaskIds.includes(t.id))
      );
    }

    if (selectedLabelIds.length > 0) {
      const taskIdsWithLabels = allLabelAssignments
        .filter((a) => selectedLabelIds.includes(a.label_id))
        .map((a) => a.task_id);
      filtered = filtered.filter((t) => taskIdsWithLabels.includes(t.id));
    }

    return filtered;
  }, [allTasks, searchQuery, selectedUserId, selectedLabelIds, allLabelAssignments, participantTaskIds]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedTasks = filteredTasks.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const allSelected = paginatedTasks.length > 0 && paginatedTasks.every((t) => selectedIds.has(t.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTasks.map((t) => t.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplyBulkAction = () => {
    if (!bulkAction || selectedIds.size === 0) return;
    selectedIds.forEach((id) => {
      if (bulkAction === "concluir") {
        onMoveTask(id, { status: "completed" });
      } else if (bulkAction === "reabrir") {
        onMoveTask(id, { status: "pending" });
      }
    });
    setSelectedIds(new Set());
    setBulkAction("");
  };

  const getTaskLabels = (taskId: string) => {
    const assignedLabelIds = allLabelAssignments
      .filter((a) => a.task_id === taskId)
      .map((a) => a.label_id);
    return labels.filter((l) => assignedLabelIds.includes(l.id));
  };

  const now = startOfDay(new Date());

  const glassBg = isDark ? "bg-white/[0.04]" : "bg-white/60";
  const glassBorder = isDark ? "border-white/10" : "border-black/5";
  const text = isDark ? "text-white" : "text-foreground";
  const textMuted = isDark ? "text-white/50" : "text-foreground/50";
  const hoverRow = isDark ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.03]";
  const headerBg = isDark ? "bg-white/[0.06]" : "bg-black/[0.03]";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Table */}
      <div className={`flex-1 min-h-0 overflow-auto rounded-xl border ${glassBorder} ${glassBg} backdrop-blur-sm`}>
        <table className="w-full text-sm">
          <thead className={`sticky top-0 z-10 ${headerBg} backdrop-blur-md`}>
            <tr className={`border-b ${glassBorder}`}>
              <th className="w-10 px-3 py-3">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </th>
              <th className={`text-left px-3 py-3 font-semibold ${text}`}>Nome</th>
              <th className={`text-left px-3 py-3 font-semibold ${text}`}>Atividade</th>
              <th className={`text-left px-3 py-3 font-semibold ${text}`}>Prazo final</th>
              <th className={`text-left px-3 py-3 font-semibold ${text}`}>Criado por</th>
              <th className={`text-left px-3 py-3 font-semibold ${text}`}>Responsável</th>
              <th className={`text-left px-3 py-3 font-semibold ${text}`}>Marcadores</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTasks.map((task) => {
              const isOverdue = task.prazo && isBefore(new Date(task.prazo), now) && task.status !== "completed";
              const taskLabels = getTaskLabels(task.id);

              return (
                <tr
                  key={task.id}
                  className={`border-b ${glassBorder} cursor-pointer transition-colors ${hoverRow} ${
                    selectedIds.has(task.id) ? (isDark ? "bg-white/[0.08]" : "bg-primary/5") : ""
                  }`}
                  onClick={() => onTaskClick(task)}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(task.id)}
                      onCheckedChange={() => toggleOne(task.id)}
                    />
                  </td>
                  <td className={`px-3 py-2.5 font-medium ${text} max-w-[280px]`}>
                    <div className="flex items-center gap-2">
                      {task.is_subtask && (
                        <Flag className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                      )}
                      <span className="truncate">{task.titulo}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: task.columnColor + "cc" }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: task.columnColor }}
                      />
                      {task.columnLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {task.prazo ? (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          isOverdue
                            ? "bg-red-500/20 text-red-400"
                            : textMuted
                        }`}
                      >
                        {format(new Date(task.prazo), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    ) : (
                      <span className={`text-xs ${textMuted}`}>—</span>
                    )}
                  </td>
                  <td className={`px-3 py-2.5 text-xs ${textMuted}`}>
                    {profileMap.get(task.proprietario_id) || "—"}
                  </td>
                  <td className={`px-3 py-2.5 text-xs ${textMuted}`}>
                    {task.responsavel_id
                      ? profileMap.get(task.responsavel_id) || "—"
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {taskLabels.slice(0, 3).map((label) => (
                        <span
                          key={label.id}
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                          style={{ backgroundColor: label.cor }}
                        >
                          {label.nome}
                        </span>
                      ))}
                      {taskLabels.length > 3 && (
                        <span className={`text-[10px] ${textMuted}`}>+{taskLabels.length - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginatedTasks.length === 0 && (
              <tr>
                <td colSpan={7} className={`text-center py-12 ${textMuted}`}>
                  Nenhuma tarefa encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer bar */}
      <div className={`flex items-center justify-between mt-2 px-3 py-2 rounded-lg ${glassBg} border ${glassBorder} backdrop-blur-sm`}>
        <div className="flex items-center gap-3">
          {/* Bulk actions */}
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className={`h-8 w-[160px] text-xs ${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-border"}`}>
              <SelectValue placeholder="Selecionar Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concluir">Marcar como concluído</SelectItem>
              <SelectItem value="reabrir">Reabrir tarefa</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className={`h-8 text-xs ${isDark ? "border-white/10 text-white hover:bg-white/10" : ""}`}
            disabled={!bulkAction || selectedIds.size === 0}
            onClick={handleApplyBulkAction}
          >
            Aplicar ({selectedIds.size})
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs ${textMuted}`}>
            {filteredTasks.length} registro{filteredTasks.length !== 1 ? "s" : ""}
          </span>

          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
            <SelectTrigger className={`h-8 w-[80px] text-xs ${isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-border"}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className={`h-7 w-7 ${isDark ? "text-white/60 hover:bg-white/10" : ""}`}
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className={`text-xs min-w-[60px] text-center ${textMuted}`}>
              {safePage + 1} / {totalPages}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className={`h-7 w-7 ${isDark ? "text-white/60 hover:bg-white/10" : ""}`}
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
