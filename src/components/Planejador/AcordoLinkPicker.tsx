import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Unlink, Handshake, ExternalLink, CheckCircle, Archive, Trash2 } from "lucide-react";
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
  useAcordosOfPlanejadorTask,
  useLinkAcordoMutations,
} from "@/hooks/usePlanejadorTaskAcordos";

interface AcordoLinkPickerProps {
  planejadorTaskId: string;
  onSelectAcordo?: (acordoTaskId: string | null) => void;
  selectedAcordoId?: string | null;
}

const statusBadge = (s: 'ativa' | 'resolvida' | 'deletada') => {
  if (s === 'resolvida') return <Badge variant="outline" className="text-emerald-500 border-emerald-500/40 text-[10px] gap-1"><CheckCircle className="h-3 w-3" />Resolvido</Badge>;
  if (s === 'deletada') return <Badge variant="outline" className="text-destructive border-destructive/40 text-[10px] gap-1"><Trash2 className="h-3 w-3" />Deletado</Badge>;
  return <Badge variant="outline" className="text-primary border-primary/40 text-[10px] gap-1"><Archive className="h-3 w-3" />Ativo</Badge>;
};

export function AcordoLinkPicker({ planejadorTaskId, onSelectAcordo, selectedAcordoId }: AcordoLinkPickerProps) {
  const { tenantId } = useTenantId();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const linkedQ = useAcordosOfPlanejadorTask(planejadorTaskId);
  const { link, unlink } = useLinkAcordoMutations();

  const { data: searchResults = [] } = useQuery({
    queryKey: ['acordos-tenant-search', tenantId, search],
    enabled: !!tenantId && showSearch,
    queryFn: async () => {
      const term = `%${search.trim()}%`;
      let q = supabase
        .from('tasks')
        .select('id, title, acordo_details, project_id, arquivamento_status')
        .eq('tenant_id', tenantId as string)
        .eq('task_type', 'acordo')
        .or('arquivamento_status.is.null,arquivamento_status.eq.ativa')
        .limit(20);
      if (search.trim()) q = q.ilike('title', term);
      const { data } = await q;
      const projIds = Array.from(new Set((data || []).map((t: any) => t.project_id))).filter(Boolean);
      let projMap = new Map<string, string>();
      if (projIds.length > 0) {
        const { data: projs } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projIds as string[]);
        projMap = new Map((projs || []).map(p => [p.id, p.name]));
      }
      return (data || []).map((t: any) => ({
        ...t,
        project_name: projMap.get(t.project_id) || '',
      }));
    },
  });

  const linkedIds = new Set((linkedQ.data || []).map(l => l.acordo_task_id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {linkedQ.data?.length || 0} acordo(s) vinculado(s)
        </span>
        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setShowSearch(s => !s)}>
          <Plus className="h-3.5 w-3.5" /> {showSearch ? 'Fechar' : 'Vincular acordo'}
        </Button>
      </div>

      {showSearch && (
        <div className="space-y-2 p-2 rounded-md border border-border bg-accent/20">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar dívidas/acordos por título..."
              className="h-8 text-sm pl-8"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {searchResults.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">Nenhum acordo ativo encontrado.</p>
            )}
            {searchResults.map((acordo: any) => {
              const alreadyLinked = linkedIds.has(acordo.id);
              return (
                <button
                  key={acordo.id}
                  disabled={alreadyLinked || link.isPending}
                  onClick={() => link.mutate({ planejadorTaskId, acordoTaskId: acordo.id })}
                  className="flex items-start gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <Handshake className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{acordo.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {acordo.acordo_details?.banco || 'Sem credor'} · {acordo.project_name}
                    </p>
                  </div>
                  {alreadyLinked && <span className="text-[10px] text-emerald-500">Vinculado</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {(linkedQ.data || []).map(item => {
          const isSelected = selectedAcordoId === item.acordo_task_id;
          return (
            <div
              key={item.link_id}
              className={`flex items-center gap-2 p-2 rounded-md border ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-accent/30'}`}
            >
              <Handshake className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {statusBadge(item.arquivamento_status)}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {item.acordo_details?.banco || 'Sem credor'}
                  {item.acordo_details?.valorAtualizado != null &&
                    ` · R$ ${Number(item.acordo_details.valorAtualizado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  {item.project_name ? ` · ${item.project_name}` : ''}
                </p>
              </div>
              {onSelectAcordo && (
                <Button
                  size="sm"
                  variant={isSelected ? "default" : "ghost"}
                  className="h-7 text-xs"
                  onClick={() => onSelectAcordo(isSelected ? null : item.acordo_task_id)}
                  title="Abrir chat deste acordo"
                >
                  Chat
                </Button>
              )}
              {item.project_id && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                  onClick={() => window.open(`/projects/${item.project_id}/acordos`, '_blank')}
                  title="Abrir no projeto"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
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
                    <AlertDialogTitle>Desvincular acordo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O vínculo entre esta tarefa do Planejador e o acordo <strong>"{item.title}"</strong> será removido.
                      O histórico do vínculo e as mensagens do chat são preservadas — o acordo continua existindo no projeto.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => unlink.mutate({ linkId: item.link_id, planejadorTaskId, acordoTaskId: item.acordo_task_id })}
                    >
                      Desvincular
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        })}
      </div>
    </div>
  );
}