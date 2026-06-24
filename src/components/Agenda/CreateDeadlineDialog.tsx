import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantId } from "@/hooks/useTenantId";
import { useToast } from "@/hooks/use-toast";
import { fetchAllPaginated } from "@/lib/supabasePagination";
import AdvogadoSelector from "@/components/Controladoria/AdvogadoSelector";
import UserTagSelector from "./UserTagSelector";
import { notifyDeadlineAssigned, notifyDeadlineTagged } from "@/utils/notificationHelpers";
import { dispatchDeadlineChange } from "@/utils/deadlineEvents";
import { DeadlineFormData } from "@/types/agenda";

interface CreateDeadlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module?: string;
  defaultDate?: Date;
  onCreated?: (deadlineId: string) => void;
  /** Pré-preenche campos do formulário (título, descrição, advogado, projeto). */
  defaultValues?: {
    title?: string;
    description?: string;
    projectId?: string;
    advogadoResponsavelId?: string | null;
  };
}

export function CreateDeadlineDialog({
  open,
  onOpenChange,
  module = 'legal',
  defaultDate,
  onCreated,
  defaultValues,
}: CreateDeadlineDialogProps) {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const { toast } = useToast();

  const [formData, setFormData] = useState<DeadlineFormData>({
    title: "",
    description: "",
    date: defaultDate ?? new Date(),
    projectId: "",
    workspaceId: "",
  });
  const [selectedAdvogado, setSelectedAdvogado] = useState<string | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; name: string; client: string }>>([]);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Array<{ id: string; nome: string }>>([]);
  const [availableProtocolos, setAvailableProtocolos] = useState<Array<{ id: string; nome: string; processo_oab_id?: string | null }>>([]);
  const [selectedProtocoloId, setSelectedProtocoloId] = useState<string>("");
  const [availableEtapas, setAvailableEtapas] = useState<Array<{ id: string; nome: string }>>([]);
  const [selectedEtapaId, setSelectedEtapaId] = useState<string>("");
  const [creatingDeadline, setCreatingDeadline] = useState(false);

  // Reset and load when dialog opens
  useEffect(() => {
    if (!open) return;
    setFormData({
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      date: defaultDate ?? new Date(),
      projectId: defaultValues?.projectId ?? "",
      workspaceId: "",
    });
    setSelectedAdvogado(defaultValues?.advogadoResponsavelId ?? null);
    setTaggedUsers([]);
    setAvailableWorkspaces([]);
    setSelectedProtocoloId("");
    setAvailableEtapas([]);
    setSelectedEtapaId("");

    if (tenantId) {
      fetchAllPaginated<any>(() =>
        supabase
          .from('projects')
          .select('id, name, client')
          .eq('tenant_id', tenantId)
          .order('name') as any
      ).then(({ data }) => setAvailableProjects(data || []));

      fetchAllPaginated<any>(() =>
        supabase
          .from('project_protocolos')
          .select('id, nome, processo_oab_id')
          .eq('tenant_id', tenantId)
          .order('nome') as any
      ).then(({ data }) => setAvailableProtocolos(data || []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tenantId]);

  const handleCreate = async () => {
    if (creatingDeadline) return;
    if (!formData.title.trim() || !user) {
      toast({ title: "Campos obrigatórios", description: "Preencha o título do prazo.", variant: "destructive" });
      return;
    }
    if (!selectedAdvogado) {
      toast({ title: "Responsável obrigatório", description: "Selecione o responsável pelo prazo.", variant: "destructive" });
      return;
    }
    if (formData.projectId && availableProtocolos.length > 0 && !selectedProtocoloId) {
      toast({
        title: "Protocolo obrigatório",
        description: "Este projeto possui protocolos cadastrados. Selecione o protocolo de origem do prazo.",
        variant: "destructive",
      });
      return;
    }

    setCreatingDeadline(true);
    try {
      let resolvedWorkspaceId: string | null = null;
      if (formData.projectId) {
        if (formData.workspaceId) {
          resolvedWorkspaceId = formData.workspaceId;
        } else {
          const { data: defaultWs } = await supabase
            .from('project_workspaces')
            .select('id')
            .eq('project_id', formData.projectId)
            .eq('is_default', true)
            .maybeSingle();
          resolvedWorkspaceId = defaultWs?.id || null;
        }
      }

      const { data, error } = await supabase
        .from('deadlines')
        .insert({
          user_id: user.id,
          tenant_id: tenantId,
          title: formData.title,
          description: formData.description,
          date: format(formData.date, 'yyyy-MM-dd'),
          project_id: formData.projectId || null,
          advogado_responsavel_id: selectedAdvogado,
          module,
          workspace_id: resolvedWorkspaceId,
          processo_oab_id: selectedProtocoloId
            ? (availableProtocolos.find(p => p.id === selectedProtocoloId)?.processo_oab_id || null)
            : null,
          protocolo_etapa_id: selectedEtapaId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[CreateDeadlineDialog] Error creating deadline:', error);
        toast({ title: "Erro", description: "Não foi possível criar o prazo.", variant: "destructive" });
        return;
      }

      if (taggedUsers.length > 0) {
        const tags = taggedUsers.map(userId => ({
          deadline_id: data.id,
          tagged_user_id: userId,
          tenant_id: tenantId,
        }));
        await supabase.from('deadline_tags').insert(tags);
      }

      if (tenantId) {
        await notifyDeadlineAssigned(
          data.id,
          formData.title,
          selectedAdvogado,
          user.id,
          tenantId,
          formData.projectId
        );
        if (taggedUsers.length > 0) {
          await notifyDeadlineTagged(
            data.id,
            formData.title,
            taggedUsers,
            user.id,
            tenantId,
            formData.projectId
          );
        }
      }

      dispatchDeadlineChange({ deadlineId: data.id, action: "created" });
      onCreated?.(data.id);
      onOpenChange(false);
      toast({ title: "Prazo criado", description: "Novo prazo adicionado à agenda com sucesso." });
    } catch (err) {
      console.error('[CreateDeadlineDialog] Error:', err);
      toast({ title: "Erro", description: "Erro inesperado ao criar prazo.", variant: "destructive" });
    } finally {
      setCreatingDeadline(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Criar Novo Prazo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Título</label>
            <Input
              placeholder="Digite o título do prazo"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              placeholder="Descreva o prazo"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[60px]"
            />
          </div>
          <div>
            <AdvogadoSelector value={selectedAdvogado} onChange={setSelectedAdvogado} />
          </div>
          <div>
            <UserTagSelector
              selectedUsers={taggedUsers}
              onChange={setTaggedUsers}
              excludeCurrentUser
            />
          </div>
          <div>
            <label className="text-sm font-medium">Projeto (opcional)</label>
            <Select
              value={formData.projectId || "none"}
              onValueChange={async (val) => {
                const projectId = val === "none" ? "" : val;
                setFormData({ ...formData, projectId, workspaceId: "" });
                setAvailableWorkspaces([]);
                setAvailableProtocolos([]);
                setSelectedProtocoloId("");
                setAvailableEtapas([]);
                setSelectedEtapaId("");
                if (projectId) {
                  const { data: ws } = await supabase
                    .from('project_workspaces')
                    .select('id, nome')
                    .eq('project_id', projectId)
                    .order('is_default', { ascending: false });
                  setAvailableWorkspaces(ws || []);
                  const { data: prots } = await fetchAllPaginated<any>(() =>
                    supabase
                      .from('project_protocolos')
                      .select('id, nome, processo_oab_id')
                      .eq('project_id', projectId)
                      .order('nome') as any
                  );
                  setAvailableProtocolos(prots || []);
                } else if (tenantId) {
                  const { data: allProts } = await fetchAllPaginated<any>(() =>
                    supabase
                      .from('project_protocolos')
                      .select('id, nome, processo_oab_id')
                      .eq('tenant_id', tenantId)
                      .order('nome') as any
                  );
                  setAvailableProtocolos(allProts || []);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem projeto</SelectItem>
                {availableProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} - {p.client}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {formData.projectId && availableWorkspaces.length > 1 && (
            <div>
              <label className="text-sm font-medium">Workspace (opcional)</label>
              <Select
                value={formData.workspaceId || "default"}
                onValueChange={(val) => setFormData({ ...formData, workspaceId: val === "default" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Workspace padrão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Workspace padrão</SelectItem>
                  {availableWorkspaces.map(ws => (
                    <SelectItem key={ws.id} value={ws.id}>{ws.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {availableProtocolos.length > 0 && (
            <div>
              <label className="text-sm font-medium">
                Protocolo <span className="text-destructive">*</span>
              </label>
              <Select
                value={selectedProtocoloId || "none"}
                onValueChange={async (val) => {
                  const protId = val === "none" ? "" : val;
                  setSelectedProtocoloId(protId);
                  setSelectedEtapaId("");
                  setAvailableEtapas([]);
                  if (protId) {
                    const { data: etapas } = await supabase
                      .from('project_protocolo_etapas')
                      .select('id, nome')
                      .eq('protocolo_id', protId)
                      .order('ordem');
                    setAvailableEtapas((etapas || []).map(e => ({ id: e.id, nome: e.nome })));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o protocolo" />
                </SelectTrigger>
                <SelectContent>
                  {availableProtocolos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {selectedProtocoloId && availableEtapas.length > 0 && (
            <div>
              <label className="text-sm font-medium">Etapa (opcional)</label>
              <Select
                value={selectedEtapaId || "none"}
                onValueChange={(val) => setSelectedEtapaId(val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem etapa</SelectItem>
                  {availableEtapas.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Data</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData({ ...formData, date })}
                  className="pointer-events-auto"
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={creatingDeadline}>
            {creatingDeadline ? <Clock className="h-4 w-4 animate-spin mr-2" /> : null}
            {creatingDeadline ? "Criando..." : "Criar Prazo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateDeadlineDialog;