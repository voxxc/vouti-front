import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, FolderOpen, FolderKanban, ArrowRight, Check, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantId } from '@/hooks/useTenantId';
import { useProjectsOptimized } from '@/hooks/useProjectsOptimized';

interface WorkspaceOption {
  id: string;
  nome: string;
  is_default: boolean;
  ordem: number;
}

interface MoveProtocoloDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocoloId: string;
  protocoloTitulo: string;
  currentProjectId: string;
  currentProjectName?: string;
  currentWorkspaceId?: string | null;
  currentWorkspaceName?: string | null;
  onMoved?: () => void;
}

export function MoveProtocoloDialog({
  open,
  onOpenChange,
  protocoloId,
  protocoloTitulo,
  currentProjectId,
  currentProjectName,
  currentWorkspaceId,
  currentWorkspaceName,
  onMoved,
}: MoveProtocoloDialogProps) {
  const { toast } = useToast();
  const { tenantId } = useTenantId();
  const { projects, isBasicLoaded } = useProjectsOptimized();

  const [search, setSearch] = useState('');
  const [targetProjectId, setTargetProjectId] = useState<string | null>(null);
  const [targetProjectName, setTargetProjectName] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearch('');
      setTargetProjectId(null);
      setTargetProjectName(null);
      setWorkspaces([]);
      setTargetWorkspaceId(null);
      setMoving(false);
    }
  }, [open]);

  // Fetch workspaces when a project is chosen
  useEffect(() => {
    if (!targetProjectId) {
      setWorkspaces([]);
      setTargetWorkspaceId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingWorkspaces(true);
      const { data, error } = await supabase
        .from('project_workspaces')
        .select('id, nome, is_default, ordem')
        .eq('project_id', targetProjectId)
        .order('ordem');
      if (cancelled) return;
      if (error) {
        toast({ title: 'Erro ao carregar workspaces', description: error.message, variant: 'destructive' });
        setWorkspaces([]);
      } else {
        const list = (data || []) as WorkspaceOption[];
        setWorkspaces(list);
        // Auto-select if only one (or pick default)
        if (list.length === 1) {
          setTargetWorkspaceId(list[0].id);
        } else {
          const def = list.find((w) => w.is_default);
          if (def) setTargetWorkspaceId(def.id);
        }
      }
      setLoadingWorkspaces(false);
    })();
    return () => { cancelled = true; };
  }, [targetProjectId, toast]);

  const availableProjects = useMemo(() => {
    return projects
      .filter((p) => p.id !== currentProjectId)
      .filter((p) => !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, currentProjectId, search]);

  const handleMove = async () => {
    if (!targetProjectId || !targetWorkspaceId || !tenantId) return;
    setMoving(true);
    try {
      // 1. Move protocol
      const { error: updErr } = await supabase
        .from('project_protocolos')
        .update({ project_id: targetProjectId, workspace_id: targetWorkspaceId })
        .eq('id', protocoloId)
        .eq('tenant_id', tenantId);
      if (updErr) throw updErr;

      // 2. Remove marcador assignments from old project (they belong to source project only)
      const { data: oldMarcadores } = await supabase
        .from('project_protocolo_marcadores' as any)
        .select('id')
        .eq('project_id', currentProjectId);
      const oldIds = (oldMarcadores || []).map((m: any) => m.id);
      if (oldIds.length > 0) {
        await supabase
          .from('project_protocolo_marcador_assignments' as any)
          .delete()
          .eq('protocolo_id', protocoloId)
          .in('marcador_id', oldIds);
      }

      const wsName = workspaces.find((w) => w.id === targetWorkspaceId)?.nome;
      toast({
        title: 'Protocolo movido',
        description: `Para "${targetProjectName}"${wsName ? ` / ${wsName}` : ''}.`,
      });
      onMoved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro ao mover', description: e.message, variant: 'destructive' });
    } finally {
      setMoving(false);
    }
  };

  const goBack = () => {
    setTargetProjectId(null);
    setTargetProjectName(null);
    setTargetWorkspaceId(null);
    setWorkspaces([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mover protocolo</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Protocolo info */}
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Protocolo</p>
            <p className="text-sm font-medium text-foreground truncate">{protocoloTitulo}</p>
            <p className="text-xs text-muted-foreground mt-1">
              De: <span className="font-medium">{currentProjectName ?? '—'}</span>
              {currentWorkspaceName && <> / <span className="font-medium">{currentWorkspaceName}</span></>}
            </p>
          </div>

          {/* Step 1: pick project */}
          {!targetProjectId ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar projeto…"
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {!isBasicLoaded ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : availableProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {search ? 'Nenhum projeto encontrado.' : 'Nenhum outro projeto disponível.'}
                  </p>
                ) : (
                  availableProjects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setTargetProjectId(p.id); setTargetProjectName(p.name); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                    >
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <FolderOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        {p.client && <p className="text-xs text-muted-foreground truncate">{p.client}</p>}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Step 2: pick workspace */
            <div className="space-y-2">
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Trocar de projeto
              </button>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-medium text-foreground truncate">{targetProjectName}</p>
              </div>
              <p className="text-xs text-muted-foreground pt-1">Escolha o workspace de destino:</p>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {loadingWorkspaces ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : workspaces.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Este projeto não tem workspaces.
                  </p>
                ) : (
                  workspaces.map((w) => {
                    const selected = targetWorkspaceId === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setTargetWorkspaceId(w.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          selected ? 'bg-primary/10' : 'hover:bg-accent'
                        }`}
                      >
                        <FolderKanban className={`h-4 w-4 shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-medium text-foreground flex-1 truncate">{w.nome}</span>
                        {w.is_default && (
                          <Badge variant="secondary" className="text-[10px] h-5">padrão</Badge>
                        )}
                        {selected && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-muted-foreground italic pt-1">
                Marcadores do projeto atual serão removidos ao mover. Etapas, anexos e comentários permanecem.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={moving}>
            Cancelar
          </Button>
          <Button
            onClick={handleMove}
            disabled={!targetProjectId || !targetWorkspaceId || moving}
          >
            {moving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Mover protocolo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}