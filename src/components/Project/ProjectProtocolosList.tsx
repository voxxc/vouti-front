import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Plus, 
  FolderKanban,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectProtocolos, ProjectProtocolo } from '@/hooks/useProjectProtocolos';
import { AddProtocoloDialog } from './AddProtocoloDialog';
import { ProjectProtocoloDrawer } from './ProjectProtocoloDrawer';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectProtocolosListProps {
  projectId: string;
  workspaceId?: string | null;
  defaultWorkspaceId?: string | null;
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

export function ProjectProtocolosList({ projectId, workspaceId, defaultWorkspaceId }: ProjectProtocolosListProps) {
  const { protocolos, loading, refetch, createProtocolo, updateProtocolo, deleteProtocolo, addEtapa, updateEtapa, deleteEtapa } = useProjectProtocolos(projectId, workspaceId, defaultWorkspaceId);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProtocoloId, setSelectedProtocoloId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Deriva o protocolo selecionado do array - sempre atualizado!
  const selectedProtocolo = selectedProtocoloId 
    ? protocolos.find(p => p.id === selectedProtocoloId) ?? null 
    : null;

  // Early return: Wait for workspace to be defined before rendering
  // Prevents flash of empty state when switching projects
  if (workspaceId === undefined && defaultWorkspaceId === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const filteredProtocolos = protocolos.filter(protocolo => {
    const matchesSearch = protocolo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      protocolo.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || protocolo.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleProtocoloClick = (protocolo: ProjectProtocolo) => {
    setSelectedProtocoloId(protocolo.id);
    setIsDrawerOpen(true);
  };

  const handleCreateProtocolo = async (data: { nome: string; descricao?: string; responsavelId?: string; dataPrevisao?: Date; observacoes?: string }) => {
    await createProtocolo(data);
    setIsAddDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-lg font-semibold hover:text-primary transition-colors"
        >
          <FolderKanban className="h-5 w-5" />
          <span>Processos</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <Badge variant="secondary" className="ml-2">
            {protocolos.length}
          </Badge>
        </button>
        
        <Button 
          variant="professional" 
          className="gap-2"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus size={16} />
          Novo processo
        </Button>
      </div>

      {isExpanded && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar processos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os processos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluídos</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            {filteredProtocolos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {protocolos.length === 0 ? (
                  <>
                    <p className="text-lg font-medium">Nenhum processo criado</p>
                    <p className="text-sm">Clique em "Novo processo" para adicionar</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium">Nenhum processo encontrado</p>
                    <p className="text-sm">Tente ajustar os filtros</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredProtocolos.map((protocolo) => {
                  const etapasConcluidas = protocolo.etapas?.filter(e => e.status === 'concluido').length || 0;
                  const totalEtapas = protocolo.etapas?.length || 0;
                  
                  return (
                    <div
                      key={protocolo.id}
                      onClick={() => handleProtocoloClick(protocolo)}
                      className="p-4 hover:bg-accent cursor-pointer border-b transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {protocolo.nome.toUpperCase()}
                          </p>
                          {protocolo.descricao && (
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {protocolo.descricao}
                            </p>
                          )}
                          {totalEtapas > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {etapasConcluidas}/{totalEtapas} etapas concluídas
                            </p>
                          )}
                        </div>
                        <Badge className={STATUS_COLORS[protocolo.status]}>
                          {STATUS_LABELS[protocolo.status]}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </>
      )}

      <AddProtocoloDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleCreateProtocolo}
      />

      <ProjectProtocoloDrawer
        protocolo={selectedProtocolo}
        open={isDrawerOpen}
        onOpenChange={(open) => {
          setIsDrawerOpen(open);
          if (!open) setSelectedProtocoloId(null);
        }}
        onUpdate={updateProtocolo}
        onDelete={async (id) => {
          await deleteProtocolo(id);
          setSelectedProtocoloId(null);
        }}
        onAddEtapa={addEtapa}
        onUpdateEtapa={updateEtapa}
        onDeleteEtapa={deleteEtapa}
        projectId={projectId}
        onRefetch={refetch}
      />
    </div>
  );
}
