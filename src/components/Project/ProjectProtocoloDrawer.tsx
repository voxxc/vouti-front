import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  FileText, 
  ListChecks, 
  History,
  Plus,
  Trash2,
  Loader2,
  X,
  Calendar,
  User,
  CheckCircle2
} from 'lucide-react';
import { ProjectProtocolo, ProjectProtocoloEtapa, CreateEtapaData } from '@/hooks/useProjectProtocolos';

interface ProjectProtocoloDrawerProps {
  protocolo: ProjectProtocolo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddEtapa: (protocoloId: string, data: CreateEtapaData) => Promise<void>;
  onUpdateEtapa: (id: string, data: any) => Promise<void>;
  onDeleteEtapa: (id: string) => Promise<void>;
}

const STATUS_LABELS: Record<ProjectProtocolo['status'], string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

const STATUS_COLORS: Record<ProjectProtocolo['status'], string> = {
  pendente: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  em_andamento: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  concluido: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelado: 'bg-muted text-muted-foreground border-muted'
};

export function ProjectProtocoloDrawer({
  protocolo,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onAddEtapa,
  onUpdateEtapa,
  onDeleteEtapa
}: ProjectProtocoloDrawerProps) {
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [newEtapaNome, setNewEtapaNome] = useState('');
  const [addingEtapa, setAddingEtapa] = useState(false);

  if (!protocolo) return null;

  const etapasConcluidas = protocolo.etapas?.filter(e => e.status === 'concluido').length || 0;
  const totalEtapas = protocolo.etapas?.length || 0;
  const progressPercent = totalEtapas > 0 ? Math.round((etapasConcluidas / totalEtapas) * 100) : 0;

  const handleStatusChange = async (newStatus: ProjectProtocolo['status']) => {
    setSaving(true);
    try {
      await onUpdate(protocolo.id, { 
        status: newStatus,
        dataConclusao: newStatus === 'concluido' ? new Date() : undefined
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onDelete(protocolo.id);
      onOpenChange(false);
    } finally {
      setSaving(false);
      setDeleteConfirm(false);
    }
  };

  const handleAddEtapa = async () => {
    if (!newEtapaNome.trim()) return;
    
    setAddingEtapa(true);
    try {
      await onAddEtapa(protocolo.id, { nome: newEtapaNome.trim() });
      setNewEtapaNome('');
    } finally {
      setAddingEtapa(false);
    }
  };

  const handleToggleEtapa = async (etapa: ProjectProtocoloEtapa) => {
    const newStatus = etapa.status === 'concluido' ? 'pendente' : 'concluido';
    await onUpdateEtapa(etapa.id, { 
      status: newStatus,
      dataConclusao: newStatus === 'concluido' ? new Date() : undefined
    });
  };

  const handleDeleteEtapa = async (etapaId: string) => {
    await onDeleteEtapa(etapaId);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DrawerTitle className="text-xl">{protocolo.nome}</DrawerTitle>
                <Badge className={STATUS_COLORS[protocolo.status]}>
                  {STATUS_LABELS[protocolo.status]}
                </Badge>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
            {totalEtapas > 0 && (
              <div className="flex items-center gap-3 mt-3">
                <Progress value={progressPercent} className="flex-1 h-2" />
                <span className="text-sm text-muted-foreground">{progressPercent}%</span>
              </div>
            )}
          </DrawerHeader>

          <Tabs defaultValue="resumo" className="flex-1">
            <TabsList className="w-full justify-start rounded-none border-b px-4">
              <TabsTrigger value="resumo" className="gap-2">
                <FileText className="w-4 h-4" />
                Resumo
              </TabsTrigger>
              <TabsTrigger value="etapas" className="gap-2">
                <ListChecks className="w-4 h-4" />
                Etapas
                {totalEtapas > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {etapasConcluidas}/{totalEtapas}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <History className="w-4 h-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[50vh]">
              <TabsContent value="resumo" className="p-4 m-0 space-y-6">
                {/* Descrição */}
                {protocolo.descricao && (
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">Descrição</Label>
                    <p className="mt-1">{protocolo.descricao}</p>
                  </div>
                )}

                {/* Informações */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Data de Início
                    </Label>
                    <p className="mt-1 font-medium">
                      {format(protocolo.dataInicio, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  
                  {protocolo.dataPrevisao && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Previsão
                      </Label>
                      <p className="mt-1 font-medium">
                        {format(protocolo.dataPrevisao, "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}

                  {protocolo.dataConclusao && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Concluído em
                      </Label>
                      <p className="mt-1 font-medium">
                        {format(protocolo.dataConclusao, "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}

                  {protocolo.responsavelNome && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Responsável
                      </Label>
                      <p className="mt-1 font-medium">{protocolo.responsavelNome}</p>
                    </div>
                  )}
                </div>

                {/* Observações */}
                {protocolo.observacoes && (
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">Observações</Label>
                    <p className="mt-1 text-sm">{protocolo.observacoes}</p>
                  </div>
                )}

                {/* Ações */}
                <div className="pt-4 border-t space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase mb-2 block">Alterar Status</Label>
                    <Select 
                      value={protocolo.status} 
                      onValueChange={(value) => handleStatusChange(value as ProjectProtocolo['status'])}
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => setDeleteConfirm(true)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Protocolo
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="etapas" className="p-4 m-0 space-y-4">
                {/* Add Etapa */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova etapa..."
                    value={newEtapaNome}
                    onChange={(e) => setNewEtapaNome(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddEtapa()}
                    disabled={addingEtapa}
                  />
                  <Button 
                    onClick={handleAddEtapa} 
                    disabled={addingEtapa || !newEtapaNome.trim()}
                  >
                    {addingEtapa ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Etapas List */}
                {(!protocolo.etapas || protocolo.etapas.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma etapa cadastrada</p>
                    <p className="text-sm">Adicione etapas para acompanhar o progresso</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {protocolo.etapas.map((etapa) => (
                      <div 
                        key={etapa.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          etapa.status === 'concluido' ? 'bg-green-500/5 border-green-500/20' : 'bg-card'
                        }`}
                      >
                        <Checkbox
                          checked={etapa.status === 'concluido'}
                          onCheckedChange={() => handleToggleEtapa(etapa)}
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${etapa.status === 'concluido' ? 'line-through text-muted-foreground' : ''}`}>
                            {etapa.nome}
                          </p>
                          {etapa.descricao && (
                            <p className="text-sm text-muted-foreground">{etapa.descricao}</p>
                          )}
                          {etapa.dataConclusao && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Concluído em {format(etapa.dataConclusao, "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteEtapa(etapa.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="historico" className="p-4 m-0">
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Histórico em breve</p>
                  <p className="text-sm">Aqui você verá todas as alterações do protocolo</p>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir protocolo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O protocolo "{protocolo.nome}" e todas as suas etapas serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
