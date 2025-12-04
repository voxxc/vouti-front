import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  GripVertical, 
  Eye, 
  Bell, 
  BellOff, 
  Loader2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useProcessosOAB, ProcessoOAB } from '@/hooks/useOABs';
import { ProcessoOABDetalhes } from './ProcessoOABDetalhes';

interface OABTabProps {
  oabId: string;
}

export const OABTab = ({ oabId }: OABTabProps) => {
  const { 
    processos, 
    loading, 
    carregandoDetalhes,
    carregarDetalhes, 
    atualizarOrdem,
    toggleMonitoramento 
  } = useProcessosOAB(oabId);
  
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoOAB | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(processos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    atualizarOrdem(items);
  };

  const handleVerDetalhes = async (processo: ProcessoOAB) => {
    setSelectedProcesso(processo);
    setDrawerOpen(true);
    
    // Carregar detalhes se ainda nao foram carregados
    if (!processo.detalhes_carregados) {
      await carregarDetalhes(processo.id, processo.numero_cnj);
    }
  };

  const handleToggleMonitoramento = async (processo: ProcessoOAB) => {
    await toggleMonitoramento(processo.id, processo.numero_cnj, !processo.monitoramento_ativo);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (processos.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-muted/20">
        <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhum processo encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          Clique em "Sincronizar" para buscar processos desta OAB
        </p>
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="processos-list">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {processos.map((processo, index) => (
                <Draggable 
                  key={processo.id} 
                  draggableId={processo.id} 
                  index={index}
                >
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`p-3 transition-shadow ${
                        snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Drag Handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                        </div>

                        {/* Processo Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium truncate">
                              {processo.numero_cnj}
                            </span>
                            {processo.monitoramento_ativo && (
                              <Badge variant="default" className="text-xs bg-green-600">
                                <Bell className="w-3 h-3 mr-1" />
                                Monitorado
                              </Badge>
                            )}
                            {(processo.andamentos_nao_lidos || 0) > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {processo.andamentos_nao_lidos} novos
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {processo.parte_ativa || 'Autor nao identificado'} 
                            {' vs '}
                            {processo.parte_passiva || 'Reu nao identificado'}
                          </p>
                          {processo.tribunal_sigla && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {processo.tribunal_sigla}
                            </Badge>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerDetalhes(processo)}
                            disabled={carregandoDetalhes === processo.id}
                          >
                            {carregandoDetalhes === processo.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                Detalhes
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Drawer de Detalhes */}
      <ProcessoOABDetalhes
        processo={selectedProcesso}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onToggleMonitoramento={handleToggleMonitoramento}
      />
    </>
  );
};
