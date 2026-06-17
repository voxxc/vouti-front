import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Unlink, ListChecks, Calendar } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  usePlanejadorTasksOfAcordo,
  useLinkAcordoMutations,
} from "@/hooks/usePlanejadorTaskAcordos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlanejadorTaskPickerProps {
  acordoTaskId: string;
}

export function PlanejadorTaskPicker({ acordoTaskId }: PlanejadorTaskPickerProps) {
  const { tenantId } = useTenantId();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const linkedQ = usePlanejadorTasksOfAcordo(acordoTaskId);
  const { link, unlink } = useLinkAcordoMutations();

  const { data: searchResults = [] } = useQuery({
    queryKey: ['planejador-tenant-search', tenantId, search],
    enabled: !!tenantId && showSearch,
    queryFn: async () => {
      const term = `%${search.trim()}%`;
      let q = (supabase as any)
        .from('planejador_tasks')
        .select('id, titulo, status, prazo')
        .eq('tenant_id', tenantId)
        .neq('status', 'completed')
        .limit(20);
      if (search.trim()) q = q.ilike('titulo', term);
      const { data } = await q;
      return data || [];
    },
  });

  const linkedIds = new Set((linkedQ.data || []).map(l => l.planejador_task_id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          Mostrar no Planejador
          <span className="text-xs text-muted-foreground font-normal">({linkedQ.data?.length || 0})</span>
        </h4>
        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setShowSearch(s => !s)}>
          <Plus className="h-3.5 w-3.5" /> {showSearch ? 'Fechar' : 'Vincular tarefa'}
        </Button>
      </div>

      {showSearch && (
        <div className="space-y-2 p-2 rounded-md border border-border bg-muted/30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarefas do Planejador..."
              className="h-8 text-sm pl-8"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {searchResults.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma tarefa encontrada.</p>
            )}
            {searchResults.map((t: any) => {
              const alreadyLinked = linkedIds.has(t.id);
              return (
                <button
                  key={t.id}
                  disabled={alreadyLinked || link.isPending}
                  onClick={() => link.mutate({ planejadorTaskId: t.id, acordoTaskId })}
                  className="flex items-start gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <ListChecks className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.titulo}</p>
                    {t.prazo && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(t.prazo), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  {alreadyLinked && <span className="text-[10px] text-emerald-500">Vinculado</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {(linkedQ.data || []).length === 0 && !showSearch && (
          <p className="text-xs text-muted-foreground py-2">
            Clique em "Vincular tarefa" para mostrar esta dívida em uma tarefa do Planejador.
          </p>
        )}
        {(linkedQ.data || []).map(item => (
          <div key={item.link_id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/20">
            <ListChecks className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.titulo}</p>
              {item.prazo && (
                <p className="text-xs text-muted-foreground">
                  Prazo: {format(new Date(item.prazo), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  title="Desvincular (mantém histórico)"
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desvincular tarefa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta dívida deixará de aparecer na tarefa <strong>"{item.titulo}"</strong> do Planejador.
                    O histórico do vínculo é preservado e a tarefa do Planejador continua existindo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => unlink.mutate({ linkId: item.link_id, planejadorTaskId: item.planejador_task_id, acordoTaskId })}
                  >
                    Desvincular
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}