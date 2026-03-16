import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Trash2, MessageSquare, ExternalLink, Flag, RotateCcw, Pencil } from "lucide-react";
import EditarPrazoDialog from "./EditarPrazoDialog";
import { DeadlineComentarios } from "./DeadlineComentarios";
import { Deadline } from "@/types/agenda";
import { format, isPast, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantId } from "@/hooks/useTenantId";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { cn } from "@/lib/utils";

interface DeadlineDetailDialogProps {
  deadlineId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// OriginTabs (duplicated for standalone usage)
function OriginTabs({
  hasVinculado, origemLabel, vinculadoLabel, selectedDeadline, onNavigateProject,
}: {
  hasVinculado: boolean;
  origemLabel: string;
  vinculadoLabel: string;
  selectedDeadline: Deadline;
  onNavigateProject: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'origem' | 'vinculado'>('origem');
  return (
    <div className="space-y-3">
      <div className="flex gap-6 border-b">
        <button onClick={() => setActiveTab('origem')} className={cn("pb-2 text-sm font-medium transition-colors relative", activeTab === 'origem' ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
          {origemLabel}
          {activeTab === 'origem' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
        </button>
        {hasVinculado && (
          <button onClick={() => setActiveTab('vinculado')} className={cn("pb-2 text-sm font-medium transition-colors relative", activeTab === 'vinculado' ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {vinculadoLabel}
            {activeTab === 'vinculado' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
        )}
      </div>
      <div className="text-sm space-y-1">
        {activeTab === 'origem' && selectedDeadline.processoOrigem && (
          <>
            {selectedDeadline.processoOrigem.numeroCnj && <p><strong>CNJ:</strong> {selectedDeadline.processoOrigem.numeroCnj}</p>}
            {selectedDeadline.processoOrigem.parteAtiva && <p><strong>Autor:</strong> {selectedDeadline.processoOrigem.parteAtiva}</p>}
            {selectedDeadline.processoOrigem.partePassiva && <p><strong>Réu:</strong> {selectedDeadline.processoOrigem.partePassiva}</p>}
            {selectedDeadline.processoOrigem.tribunal && <p><strong>Tribunal:</strong> {selectedDeadline.processoOrigem.tribunal}</p>}
          </>
        )}
        {activeTab === 'origem' && selectedDeadline.protocoloOrigem && (
          <>
            {selectedDeadline.protocoloOrigem.protocoloNome && <p><strong>Processo:</strong> {selectedDeadline.protocoloOrigem.protocoloNome}</p>}
            {selectedDeadline.protocoloOrigem.etapaNome && <p><strong>Etapa:</strong> {selectedDeadline.protocoloOrigem.etapaNome}</p>}
            {selectedDeadline.protocoloOrigem.projectId && (
              <Button variant="link" size="sm" className="p-0 h-auto text-primary" onClick={() => onNavigateProject(selectedDeadline.protocoloOrigem!.projectId!)}>
                <ExternalLink className="h-3 w-3 mr-1" /> Ver Projeto
              </Button>
            )}
          </>
        )}
        {activeTab === 'vinculado' && selectedDeadline.casoVinculado && (
          <>
            {selectedDeadline.casoVinculado.numeroCnj && <p><strong>CNJ:</strong> {selectedDeadline.casoVinculado.numeroCnj}</p>}
            {selectedDeadline.casoVinculado.parteAtiva && <p><strong>Autor:</strong> {selectedDeadline.casoVinculado.parteAtiva}</p>}
            {selectedDeadline.casoVinculado.partePassiva && <p><strong>Réu:</strong> {selectedDeadline.casoVinculado.partePassiva}</p>}
            {selectedDeadline.casoVinculado.tribunal && <p><strong>Tribunal:</strong> {selectedDeadline.casoVinculado.tribunal}</p>}
          </>
        )}
        {activeTab === 'vinculado' && selectedDeadline.protocoloVinculado && (
          <>
            {selectedDeadline.protocoloVinculado.protocoloNome && <p><strong>Processo:</strong> {selectedDeadline.protocoloVinculado.protocoloNome}</p>}
            {selectedDeadline.protocoloVinculado.projectId && (
              <Button variant="link" size="sm" className="p-0 h-auto text-primary" onClick={() => onNavigateProject(selectedDeadline.protocoloVinculado!.projectId!)}>
                <ExternalLink className="h-3 w-3 mr-1" /> Ver Projeto
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function DeadlineDetailDialog({ deadlineId, open, onOpenChange }: DeadlineDetailDialogProps) {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const { tenantSlug } = useTenantNavigation();
  const { toast } = useToast();
  const [deadline, setDeadline] = useState<Deadline | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);
  const [comentarioConclusao, setComentarioConclusao] = useState("");
  const [criarSubtarefa, setCriarSubtarefa] = useState(false);
  const [subtarefaDescricao, setSubtarefaDescricao] = useState("");

  const safeParseDate = (dateString: string | null | undefined): Date => {
    if (!dateString) return new Date();
    try {
      const parsed = parseISO(dateString + 'T12:00:00');
      return isValid(parsed) ? parsed : new Date();
    } catch { return new Date(); }
  };

  const safeFormatDate = (date: Date, formatStr: string = "dd/MM/yyyy"): string => {
    try {
      return isValid(date) ? format(date, formatStr, { locale: ptBR }) : "Data inválida";
    } catch { return "Data inválida"; }
  };

  const safeIsPast = (date: Date): boolean => {
    try { return isValid(date) && isPast(date); } catch { return false; }
  };

  const safeParseTimestamp = (timestamp: string | null | undefined): Date => {
    if (!timestamp) return new Date();
    try { const p = new Date(timestamp); return isValid(p) ? p : new Date(); } catch { return new Date(); }
  };

  useEffect(() => {
    if (open && deadlineId) {
      fetchDeadline(deadlineId);
    } else if (!open) {
      setDeadline(null);
    }
  }, [open, deadlineId]);

  const fetchDeadline = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deadlines')
        .select(`
          *,
          projects (name, client),
          advogado:profiles!deadlines_advogado_responsavel_id_fkey (user_id, full_name, avatar_url),
          deadline_tags (tagged_user_id, tagged_user:profiles!deadline_tags_tagged_user_id_fkey (user_id, full_name, avatar_url)),
          processo_oab:processos_oab (id, numero_cnj, parte_ativa, parte_passiva, tribunal),
          protocolo_etapa:project_protocolo_etapas (id, nome, protocolo:project_protocolos (id, nome, project_id, processo_oab_id, workspace_id))
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('[DeadlineDetailDialog] Error:', error);
        setLoading(false);
        return;
      }

      const d = data as any;

      // Fetch linked caso/protocolo
      let casoVinculado: any = undefined;
      let protocoloVinculado: any = undefined;

      const protocoloProcessoOabId = d.protocolo_etapa?.protocolo?.processo_oab_id;
      if (protocoloProcessoOabId) {
        const { data: caso } = await supabase.from('processos_oab').select('id, numero_cnj, parte_ativa, parte_passiva, tribunal').eq('id', protocoloProcessoOabId).single();
        if (caso) casoVinculado = caso;
      }
      if (d.processo_oab_id && !d.protocolo_etapa_id) {
        const { data: prot } = await supabase.from('project_protocolos').select('id, nome, project_id, processo_oab_id, workspace_id').eq('processo_oab_id', d.processo_oab_id).limit(1).maybeSingle();
        if (prot) protocoloVinculado = prot;
      }

      // Fetch workspace name
      let workspaceName: string | undefined;
      if (d.workspace_id) {
        const { data: ws } = await supabase.from('project_workspaces').select('nome').eq('id', d.workspace_id).single();
        if (ws) workspaceName = ws.nome;
      }

      // Fetch creator and completer profiles in parallel
      let creatorName: string | undefined;
      let creatorAvatar: string | undefined;
      let completedByName: string | undefined;
      let completedByAvatar: string | undefined;
      
      const profilePromises: Promise<void>[] = [];
      if (d.user_id) {
        profilePromises.push(
          supabase.from('profiles').select('full_name, avatar_url').eq('user_id', d.user_id).single()
            .then(({ data: creator }) => { if (creator) { creatorName = creator.full_name; creatorAvatar = creator.avatar_url || undefined; } }) as Promise<void>
        );
      }
      if (d.concluido_por && d.concluido_por !== d.user_id) {
        profilePromises.push(
          supabase.from('profiles').select('full_name, avatar_url').eq('user_id', d.concluido_por).single()
            .then(({ data: completer }) => { if (completer) { completedByName = completer.full_name; completedByAvatar = completer.avatar_url || undefined; } }) as Promise<void>
        );
      } else if (d.concluido_por && d.concluido_por === d.user_id) {
        // Same user, reuse after promise resolves
        profilePromises.push(
          Promise.resolve().then(() => { completedByName = creatorName; completedByAvatar = creatorAvatar; })
        );
      }
      await Promise.all(profilePromises);
      // If same user, values may not be set yet due to race, fix:
      if (d.concluido_por === d.user_id) { completedByName = creatorName; completedByAvatar = creatorAvatar; }

      const mapped: Deadline = {
        id: d.id,
        title: d.title,
        description: d.description || '',
        date: safeParseDate(d.date),
        projectId: d.project_id,
        projectName: d.projects?.name || 'Projeto não encontrado',
        clientName: d.projects?.client || 'Cliente não encontrado',
        completed: d.completed,
        advogadoResponsavel: d.advogado ? { userId: d.advogado.user_id, name: d.advogado.full_name, avatar: d.advogado.avatar_url } : undefined,
        taggedUsers: (d.deadline_tags || []).filter((t: any) => t.tagged_user).map((t: any) => ({ userId: t.tagged_user?.user_id, name: t.tagged_user?.full_name || 'Usuário', avatar: t.tagged_user?.avatar_url })),
        processoOabId: d.processo_oab_id || undefined,
        createdAt: safeParseTimestamp(d.created_at),
        updatedAt: safeParseTimestamp(d.updated_at),
        // Only show processoOrigem if it's genuinely linked (not leaked from __currentProcessoOabId)
        // When deadline has protocolo_etapa_id, only show processo if the protocolo itself references that processo
        processoOrigem: d.processo_oab && (!d.protocolo_etapa_id || protocoloProcessoOabId === d.processo_oab_id) ? { id: d.processo_oab.id, numeroCnj: d.processo_oab.numero_cnj, parteAtiva: d.processo_oab.parte_ativa, partePassiva: d.processo_oab.parte_passiva, tribunal: d.processo_oab.tribunal } : undefined,
        protocoloOrigem: d.protocolo_etapa ? { etapaId: d.protocolo_etapa.id, etapaNome: d.protocolo_etapa.nome, protocoloNome: d.protocolo_etapa.protocolo?.nome, projectId: d.protocolo_etapa.protocolo?.project_id } : undefined,
        casoVinculado: casoVinculado ? { id: casoVinculado.id, numeroCnj: casoVinculado.numero_cnj, parteAtiva: casoVinculado.parte_ativa, partePassiva: casoVinculado.parte_passiva, tribunal: casoVinculado.tribunal } : undefined,
        protocoloVinculado: protocoloVinculado ? { etapaId: '', protocoloNome: protocoloVinculado.nome, projectId: protocoloVinculado.project_id, protocoloId: protocoloVinculado.id } : undefined,
        workspaceName,
        createdByUserId: d.user_id || undefined,
        completedByUserId: d.concluido_por || undefined,
        createdByName: creatorName,
        createdByAvatar: creatorAvatar,
        completedByName,
        completedByAvatar,
        comentarioConclusao: d.comentario_conclusao || undefined,
        concluidoEm: d.concluido_em ? safeParseTimestamp(d.concluido_em) : undefined,
      };

      setDeadline(mapped);
    } catch (err) {
      console.error('[DeadlineDetailDialog] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deadline || !user) return;
    try {
      const { error } = await supabase.from('deadlines').delete().eq('id', deadline.id);
      if (error) { toast({ title: "Erro", description: "Não foi possível excluir o prazo.", variant: "destructive" }); return; }
      toast({ title: "Prazo excluído", description: "Prazo foi removido com sucesso." });
      onOpenChange(false);
    } catch { toast({ title: "Erro", description: "Erro inesperado ao excluir prazo.", variant: "destructive" }); }
  };

  const handleConfirmComplete = async () => {
    if (!confirmCompleteId || !comentarioConclusao.trim() || !deadline) return;
    try {
      const { error } = await supabase.from('deadlines').update({
        completed: true, comentario_conclusao: comentarioConclusao.trim(), concluido_por: user?.id, concluido_em: new Date().toISOString()
      }).eq('id', confirmCompleteId);
      if (error) { toast({ title: "Erro", description: "Não foi possível concluir o prazo.", variant: "destructive" }); return; }

      if (criarSubtarefa && subtarefaDescricao.trim()) {
        await supabase.from('deadline_subtarefas').insert({ deadline_id: confirmCompleteId, descricao: subtarefaDescricao.trim(), criado_por: user?.id, tenant_id: tenantId });
      }

      setConfirmCompleteId(null);
      setComentarioConclusao("");
      setCriarSubtarefa(false);
      setSubtarefaDescricao("");
      setDeadline({ ...deadline, completed: true });
      toast({ title: "Prazo concluído", description: "Prazo marcado como concluído com comentário registrado." });
    } catch { toast({ title: "Erro", description: "Erro inesperado ao concluir prazo.", variant: "destructive" }); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          {loading && <div className="py-8 text-center text-muted-foreground">Carregando...</div>}
          {!loading && deadline && (
            <>
              <DialogHeader>
                <DialogTitle>{deadline.title}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="info" className="w-full">
                <TabsList className={cn("grid w-full", deadline.completed ? "grid-cols-3" : "grid-cols-2")}>
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  {deadline.completed && (
                    <TabsTrigger value="conclusao">
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Conclusão
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="comments">
                    <MessageSquare className="h-4 w-4 mr-2" /> Comentários
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                    <p className="text-foreground">{deadline.description || 'Sem descrição'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data</label>
                      <p className="text-foreground">{safeFormatDate(deadline.date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Projeto</label>
                      <p className="text-foreground">{deadline.projectName}</p>
                    </div>
                  </div>
                  {deadline.workspaceName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Workspace</label>
                      <p className="text-foreground">{deadline.workspaceName}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                    <p className="text-foreground">{deadline.clientName}</p>
                  </div>
                  {deadline.advogadoResponsavel && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Advogado Responsável</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={deadline.advogadoResponsavel.avatar} />
                          <AvatarFallback className="text-xs">{deadline.advogadoResponsavel.name?.charAt(0).toUpperCase() || 'A'}</AvatarFallback>
                        </Avatar>
                        <span>{deadline.advogadoResponsavel.name}</span>
                      </div>
                    </div>
                  )}
                  {deadline.taggedUsers && deadline.taggedUsers.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Usuários Marcados</label>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {deadline.taggedUsers.map((tagged, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={tagged.avatar} />
                              <AvatarFallback className="text-xs">{tagged.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{tagged.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(deadline.processoOrigem || deadline.protocoloOrigem) && (() => {
                    const hasVinculado = !!(deadline.casoVinculado || deadline.protocoloVinculado);
                    const origemLabel = deadline.processoOrigem ? "Processo Judicial" : "Processo de Origem";
                    const vinculadoLabel = deadline.casoVinculado ? "Caso Vinculado" : "Processo Vinculado";
                    return (
                      <OriginTabs
                        hasVinculado={hasVinculado}
                        origemLabel={origemLabel}
                        vinculadoLabel={vinculadoLabel}
                        selectedDeadline={deadline}
                        onNavigateProject={(projectId) => {
                          const base = tenantSlug ? `/${tenantSlug}` : '';
                          window.open(`${base}/project/${projectId}?clearDrawer=true`, '_blank');
                        }}
                      />
                    );
                  })()}
                  {deadline.createdByName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Criado por</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={deadline.createdByAvatar} />
                          <AvatarFallback className="text-xs">{deadline.createdByName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <span>{deadline.createdByName}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant={deadline.completed ? "default" : safeIsPast(deadline.date) ? "destructive" : "secondary"} className="ml-2">
                      {deadline.completed ? "Concluído" : safeIsPast(deadline.date) ? "Atrasado" : "Pendente"}
                    </Badge>
                  </div>
                  <div className="flex gap-2 pt-4">
                    {!deadline.completed && (
                      <Button onClick={() => setConfirmCompleteId(deadline.id)} className="flex-1">
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como Concluído
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Prazo</AlertDialogTitle>
                          <AlertDialogDescription>Tem certeza que deseja excluir este prazo? Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TabsContent>
                {deadline.completed && (
                  <TabsContent value="conclusao" className="space-y-4 mt-4">
                    {deadline.comentarioConclusao ? (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Comentário de Conclusão</label>
                        <p className="text-foreground mt-1 whitespace-pre-wrap">{deadline.comentarioConclusao}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Nenhum comentário de conclusão registrado.</p>
                    )}
                    {deadline.completedByName && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Concluído por</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={deadline.completedByAvatar} />
                            <AvatarFallback className="text-xs">{deadline.completedByName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                          </Avatar>
                          <span>{deadline.completedByName}</span>
                        </div>
                      </div>
                    )}
                    {deadline.concluidoEm && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data de Conclusão</label>
                        <p className="text-foreground">{safeFormatDate(deadline.concluidoEm, "dd/MM/yyyy 'às' HH:mm")}</p>
                      </div>
                    )}
                  </TabsContent>
                )}
                <TabsContent value="comments" className="mt-4">
                  <DeadlineComentarios deadlineId={deadline.id} currentUserId={user?.id || ''} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm complete dialog */}
      <AlertDialog open={!!confirmCompleteId} onOpenChange={(open) => { if (!open) { setConfirmCompleteId(null); setComentarioConclusao(""); setCriarSubtarefa(false); setSubtarefaDescricao(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Conclusão do Prazo</AlertDialogTitle>
            <AlertDialogDescription>Descreva o que foi realizado para concluir este prazo.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Comentário de Conclusão *</label>
            <Textarea value={comentarioConclusao} onChange={(e) => setComentarioConclusao(e.target.value)} placeholder="Descreva o que foi realizado..." rows={4} className="mt-2" />
            {!comentarioConclusao.trim() && <p className="text-xs text-muted-foreground mt-1">O comentário é obrigatório para concluir o prazo.</p>}
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="criar-subtarefa-standalone" checked={criarSubtarefa} onCheckedChange={(c) => setCriarSubtarefa(c === true)} />
              <label htmlFor="criar-subtarefa-standalone" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Flag className="h-4 w-4 text-orange-500" /> Criar subtarefa
              </label>
            </div>
            {criarSubtarefa && (
              <div className="mt-3 pl-6">
                <label className="text-sm font-medium">Descrição da subtarefa</label>
                <Textarea value={subtarefaDescricao} onChange={(e) => setSubtarefaDescricao(e.target.value)} placeholder="Descreva a subtarefa..." rows={2} className="mt-1" />
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmComplete} disabled={!comentarioConclusao.trim() || (criarSubtarefa && !subtarefaDescricao.trim())}>
              Confirmar Conclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
