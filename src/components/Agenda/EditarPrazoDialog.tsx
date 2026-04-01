import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import AdvogadoSelector from '@/components/Controladoria/AdvogadoSelector';
import UserTagSelector from './UserTagSelector';
import { notifyDeadlineAssigned, notifyDeadlineTagged } from '@/utils/notificationHelpers';
import { Deadline } from '@/types/agenda';

interface EditarPrazoDialogProps {
  deadline: Deadline | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tenantId: string;
}

export const EditarPrazoDialog = ({
  deadline,
  open,
  onOpenChange,
  onSuccess,
  tenantId
}: EditarPrazoDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Basic fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [originalDate, setOriginalDate] = useState<Date | undefined>(undefined);
  const [advogadoId, setAdvogadoId] = useState<string | null>(null);
  const [originalAdvogadoId, setOriginalAdvogadoId] = useState<string | null>(null);
  const [motivoTroca, setMotivoTroca] = useState('');
  const [motivoData, setMotivoData] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [originalTaggedUsers, setOriginalTaggedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Cascade selectors
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedProtocoloId, setSelectedProtocoloId] = useState<string>('');
  const [selectedEtapaId, setSelectedEtapaId] = useState<string>('');

  // Lists
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; name: string; client: string }>>([]);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Array<{ id: string; nome: string }>>([]);
  const [availableProtocolos, setAvailableProtocolos] = useState<Array<{ id: string; nome: string; processo_oab_id?: string | null }>>([]);
  const [availableEtapas, setAvailableEtapas] = useState<Array<{ id: string; nome: string }>>([]);

  // Original values for audit
  const [originalProjectId, setOriginalProjectId] = useState<string>('');
  const [originalProtocoloId, setOriginalProtocoloId] = useState<string>('');
  const [originalEtapaId, setOriginalEtapaId] = useState<string>('');

  const responsavelChanged = advogadoId !== originalAdvogadoId;
  const dateChanged = date && originalDate ? format(date, 'yyyy-MM-dd') !== format(originalDate, 'yyyy-MM-dd') : false;

  // Load data when dialog opens
  useEffect(() => {
    if (!deadline || !open || !tenantId) return;

    setTitle(deadline.title || '');
    setDescription(deadline.description || '');
    setDate(deadline.date);
    setOriginalDate(deadline.date);
    const initialAdvogado = deadline.advogadoResponsavel?.userId || null;
    setAdvogadoId(initialAdvogado);
    setOriginalAdvogadoId(initialAdvogado);
    setMotivoTroca('');
    setMotivoData('');
    const initialTagged = deadline.taggedUsers?.map(u => u.userId) || [];
    setTaggedUsers(initialTagged);
    setOriginalTaggedUsers(initialTagged);

    // Set project
    const projId = deadline.projectId || '';
    setSelectedProjectId(projId);
    setOriginalProjectId(projId);

    // Set etapa
    const etapaId = deadline.protocoloEtapaId || '';
    setSelectedEtapaId(etapaId);
    setOriginalEtapaId(etapaId);

    // Load projects
    supabase
      .from('projects')
      .select('id, name, client')
      .eq('tenant_id', tenantId)
      .order('name')
      .then(({ data }) => setAvailableProjects(data || []));

    // Resolve protocolo from etapa and load cascading data
    const initCascade = async () => {
      let protId = '';

      // If deadline has a protocolo_etapa, find its protocolo
      if (etapaId) {
        const { data: etapaData } = await supabase
          .from('project_protocolo_etapas')
          .select('protocolo_id')
          .eq('id', etapaId)
          .single();
        if (etapaData) {
          protId = etapaData.protocolo_id;
        }
      }

      setSelectedProtocoloId(protId);
      setOriginalProtocoloId(protId);

      // Load workspaces if project selected
      if (projId) {
        const { data: ws } = await supabase
          .from('project_workspaces')
          .select('id, nome')
          .eq('project_id', projId)
          .order('is_default', { ascending: false });
        setAvailableWorkspaces(ws || []);

        // Load protocolos for this project (filtered by workspace if available)
        const protsQuery = supabase
          .from('project_protocolos')
          .select('id, nome, processo_oab_id')
          .eq('project_id', projId)
          .order('nome');
        
        const wsId = deadline.workspaceId || '';
        if (wsId) {
          protsQuery.eq('workspace_id', wsId);
        }
        const { data: prots } = await protsQuery;
        setAvailableProtocolos(prots || []);
      } else {
        setAvailableWorkspaces([]);
        // Load all tenant protocolos
        const { data: allProts } = await supabase
          .from('project_protocolos')
          .select('id, nome, processo_oab_id')
          .eq('tenant_id', tenantId)
          .order('nome');
        setAvailableProtocolos(allProts || []);
      }

      // Load etapas if protocolo selected
      if (protId) {
        const { data: etapas } = await supabase
          .from('project_protocolo_etapas')
          .select('id, nome')
          .eq('protocolo_id', protId)
          .order('ordem');
        setAvailableEtapas(etapas || []);
      } else {
        setAvailableEtapas([]);
      }

      // Set workspace
      const wsId = deadline.workspaceId || '';
      setSelectedWorkspaceId(wsId);
    };

    initCascade();
  }, [deadline, open, tenantId]);

  // Handle project change
  const handleProjectChange = async (val: string) => {
    const projectId = val === 'none' ? '' : val;
    setSelectedProjectId(projectId);
    setSelectedWorkspaceId('');
    setAvailableWorkspaces([]);
    setAvailableProtocolos([]);
    setSelectedProtocoloId('');
    setAvailableEtapas([]);
    setSelectedEtapaId('');

    if (projectId) {
      const [wsRes, protsRes] = await Promise.all([
        supabase.from('project_workspaces').select('id, nome').eq('project_id', projectId).order('is_default', { ascending: false }),
        supabase.from('project_protocolos').select('id, nome, processo_oab_id').eq('project_id', projectId).order('nome'),
      ]);
      setAvailableWorkspaces(wsRes.data || []);
      setAvailableProtocolos(protsRes.data || []);
    } else if (tenantId) {
      const { data: allProts } = await supabase
        .from('project_protocolos')
        .select('id, nome, processo_oab_id')
        .eq('tenant_id', tenantId)
        .order('nome');
      setAvailableProtocolos(allProts || []);
    }
  };

  // Handle protocolo change
  const handleProtocoloChange = async (val: string) => {
    const protId = val === 'none' ? '' : val;
    setSelectedProtocoloId(protId);
    setSelectedEtapaId('');
    setAvailableEtapas([]);

    if (protId) {
      const { data: etapas } = await supabase
        .from('project_protocolo_etapas')
        .select('id, nome')
        .eq('protocolo_id', protId)
        .order('ordem');
      setAvailableEtapas(etapas || []);
    }
  };

  const handleSave = async () => {
    if (!deadline || !user) return;
    
    if (!title.trim()) {
      toast({ title: "Campo obrigatório", description: "O título do prazo é obrigatório.", variant: "destructive" });
      return;
    }

    if (!advogadoId) {
      toast({ title: "Campo obrigatório", description: "Selecione o advogado responsável.", variant: "destructive" });
      return;
    }

    if (!date) {
      toast({ title: "Campo obrigatório", description: "Selecione a data do prazo.", variant: "destructive" });
      return;
    }

    if (dateChanged && !motivoData.trim()) {
      toast({ title: "Campo obrigatório", description: "Informe o motivo da alteração de data.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Build audit changes
      const changes: string[] = [];
      if (title !== deadline.title) changes.push(`Título: "${deadline.title}" → "${title}"`);
      if (description !== deadline.description) changes.push(`Descrição alterada`);
      if (format(date, 'yyyy-MM-dd') !== format(deadline.date, 'yyyy-MM-dd')) {
        changes.push(`Data: ${format(deadline.date, 'dd/MM/yyyy')} → ${format(date, 'dd/MM/yyyy')}`);
      }
      if (selectedProjectId !== originalProjectId) {
        const oldProj = availableProjects.find(p => p.id === originalProjectId);
        const newProj = availableProjects.find(p => p.id === selectedProjectId);
        changes.push(`Projeto: ${oldProj?.name || 'Nenhum'} → ${newProj?.name || 'Nenhum'}`);
      }
      if (selectedProtocoloId !== originalProtocoloId) {
        const oldProt = availableProtocolos.find(p => p.id === originalProtocoloId);
        const newProt = availableProtocolos.find(p => p.id === selectedProtocoloId);
        changes.push(`Protocolo: ${oldProt?.nome || 'Nenhum'} → ${newProt?.nome || 'Nenhum'}`);
      }
      if (selectedEtapaId !== originalEtapaId) {
        const oldEtapa = availableEtapas.find(e => e.id === originalEtapaId);
        const newEtapa = availableEtapas.find(e => e.id === selectedEtapaId);
        changes.push(`Etapa: ${oldEtapa?.nome || 'Nenhuma'} → ${newEtapa?.nome || 'Nenhuma'}`);
      }

      // Resolve workspace
      let resolvedWorkspaceId: string | null = null;
      if (selectedProjectId) {
        if (selectedWorkspaceId) {
          resolvedWorkspaceId = selectedWorkspaceId;
        } else {
          const { data: defaultWs } = await supabase
            .from('project_workspaces')
            .select('id')
            .eq('project_id', selectedProjectId)
            .eq('is_default', true)
            .maybeSingle();
          resolvedWorkspaceId = defaultWs?.id || null;
        }
      }

      // Resolve processo_oab_id from protocolo
      const processoOabId = selectedProtocoloId
        ? (availableProtocolos.find(p => p.id === selectedProtocoloId)?.processo_oab_id || null)
        : null;

      // 1. Update deadline
      const { error: updateError } = await supabase
        .from('deadlines')
        .update({
          title: title.trim(),
          description: description.trim(),
          date: format(date, 'yyyy-MM-dd'),
          advogado_responsavel_id: advogadoId,
          project_id: selectedProjectId || null,
          workspace_id: resolvedWorkspaceId,
          protocolo_etapa_id: selectedEtapaId || null,
          processo_oab_id: processoOabId,
          updated_at: new Date().toISOString()
        })
        .eq('id', deadline.id);

      if (updateError) throw updateError;

      // 2. Update tags
      await supabase.from('deadline_tags').delete().eq('deadline_id', deadline.id);

      if (taggedUsers.length > 0) {
        await supabase.from('deadline_tags').insert(
          taggedUsers.map(userId => ({
            deadline_id: deadline.id,
            tagged_user_id: userId,
            tenant_id: tenantId
          }))
        );
      }

      // 2b. Notify newly tagged users
      const newlyTagged = taggedUsers.filter(id => !originalTaggedUsers.includes(id));
      if (newlyTagged.length > 0) {
        await notifyDeadlineTagged(deadline.id, title.trim(), newlyTagged, user.id, tenantId);
      }

      // 3. Audit comment for generic changes
      if (changes.length > 0) {
        await supabase.from('deadline_comentarios').insert({
          deadline_id: deadline.id,
          user_id: user.id,
          comentario: `✏️ Prazo editado:\n${changes.join('\n')}`,
          tenant_id: tenantId
        });
      }

      // 3b. Detailed comment for date change
      if (dateChanged && originalDate && date) {
        const editorRes = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single();
        const nomeEditor = editorRes.data?.full_name || 'Usuário';
        const comentarioData = `📅 Data do prazo alterada\nDe: ${format(originalDate, 'dd/MM/yyyy')}\nPara: ${format(date, 'dd/MM/yyyy')}\nMotivo: ${motivoData.trim()}\nAlterado por: ${nomeEditor}`;
        await supabase.from('deadline_comentarios').insert({
          deadline_id: deadline.id,
          user_id: user.id,
          comentario: comentarioData,
          tenant_id: tenantId
        });
      }

      if (responsavelChanged && advogadoId) {
        const [editorRes, antigoRes, novoRes] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('user_id', user.id).single(),
          originalAdvogadoId
            ? supabase.from('profiles').select('full_name').eq('user_id', originalAdvogadoId).single()
            : Promise.resolve({ data: null }),
          supabase.from('profiles').select('full_name').eq('user_id', advogadoId).single(),
        ]);

        const nomeEditor = editorRes.data?.full_name || 'Usuário';
        const nomeAntigo = antigoRes.data?.full_name || 'Não definido';
        const nomeNovo = novoRes.data?.full_name || 'Não definido';

        let comentarioTroca = `🔄 Responsável do prazo alterado\nAlterado por: ${nomeEditor}\nDe: ${nomeAntigo} → Para: ${nomeNovo}`;
        if (motivoTroca.trim()) {
          comentarioTroca += `\nMotivo: ${motivoTroca.trim()}`;
        }

        await supabase.from('deadline_comentarios').insert({
          deadline_id: deadline.id,
          user_id: user.id,
          comentario: comentarioTroca,
          tenant_id: tenantId
        });

        await notifyDeadlineAssigned(deadline.id, title.trim(), advogadoId, user.id, tenantId);
      }

      toast({ title: "Prazo atualizado", description: "As alterações foram salvas com sucesso." });
      onOpenChange(false);
      onSuccess();

    } catch (error) {
      console.error('Erro ao salvar prazo:', error);
      toast({ title: "Erro", description: "Não foi possível salvar as alterações.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Prazo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Título *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do prazo"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do prazo"
              className="mt-1 min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Data *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="pointer-events-auto"
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {dateChanged && (
            <div className="overflow-hidden animate-in slide-in-from-top-2 duration-200">
              <label className="text-sm font-medium text-destructive">
                Motivo da alteração de data *
              </label>
              <Textarea
                value={motivoData}
                onChange={(e) => setMotivoData(e.target.value)}
                placeholder="Informe o motivo da alteração da data do prazo..."
                className="mt-1 min-h-[60px]"
              />
            </div>
          )}

          <div>
            <AdvogadoSelector 
              value={advogadoId} 
              onChange={setAdvogadoId}
            />
          </div>

          {responsavelChanged && (
            <div className="overflow-hidden animate-in slide-in-from-top-2 duration-200">
              <label className="text-sm font-medium text-accent-foreground">
                Motivo da alteração de responsável
              </label>
              <Textarea
                value={motivoTroca}
                onChange={(e) => setMotivoTroca(e.target.value)}
                placeholder="Informe o motivo da troca de responsável..."
                className="mt-1 min-h-[60px]"
              />
            </div>
          )}

          <div>
            <UserTagSelector
              selectedUsers={taggedUsers}
              onChange={setTaggedUsers}
              excludeCurrentUser
            />
          </div>

          {/* Cascade selectors */}
          <div>
            <label className="text-sm font-medium">Projeto (opcional)</label>
            <Select
              value={selectedProjectId || 'none'}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger className="mt-1">
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

          {selectedProjectId && availableWorkspaces.length > 1 && (
            <div>
              <label className="text-sm font-medium">Workspace (opcional)</label>
              <Select
                value={selectedWorkspaceId || 'default'}
                onValueChange={(val) => setSelectedWorkspaceId(val === 'default' ? '' : val)}
              >
                <SelectTrigger className="mt-1">
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
              <label className="text-sm font-medium">Protocolo (opcional)</label>
              <Select
                value={selectedProtocoloId || 'none'}
                onValueChange={handleProtocoloChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sem protocolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem protocolo</SelectItem>
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
                value={selectedEtapaId || 'none'}
                onValueChange={(val) => setSelectedEtapaId(val === 'none' ? '' : val)}
              >
                <SelectTrigger className="mt-1">
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

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditarPrazoDialog;
