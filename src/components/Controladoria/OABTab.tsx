import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  GripVertical, 
  Eye, 
  Bell, 
  Loader2,
  FileText,
  BookOpen,
  BookUp,
  FileQuestion,
  ChevronDown,
  Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProcessosOAB, ProcessoOAB } from '@/hooks/useOABs';
import { ProcessoOABDetalhes } from './ProcessoOABDetalhes';

interface OABTabProps {
  oabId: string;
}

interface ProcessosAgrupados {
  primeiraInstancia: ProcessoOAB[];
  segundaInstancia: ProcessoOAB[];
  semInstancia: ProcessoOAB[];
}

const agruparPorInstancia = (processos: ProcessoOAB[]): ProcessosAgrupados => {
  const primeiraInstancia: ProcessoOAB[] = [];
  const segundaInstancia: ProcessoOAB[] = [];
  const semInstancia: ProcessoOAB[] = [];
  
  processos.forEach(processo => {
    const instance = processo.capa_completa?.instance;
    if (instance === 1) {
      primeiraInstancia.push(processo);
    } else if (instance === 2) {
      segundaInstancia.push(processo);
    } else {
      semInstancia.push(processo);
    }
  });
  
  return { primeiraInstancia, segundaInstancia, semInstancia };
};

interface ProcessoCardProps {
  processo: ProcessoOAB;
  index: number;
  onVerDetalhes: (processo: ProcessoOAB) => void;
  carregandoDetalhes: string | null;
}

const ProcessoCard = ({ processo, index, onVerDetalhes, carregandoDetalhes }: ProcessoCardProps) => {
  const temRecursoVinculado = processo.capa_completa?.related_lawsuits?.length > 0;
  const processosRelacionados = processo.capa_completa?.related_lawsuits || [];

  return (
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
              <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                {temRecursoVinculado && (
                  <Badge variant="outline" className="text-xs border-purple-500 text-purple-600">
                    <Link2 className="w-3 h-3 mr-1" />
                    {processosRelacionados.length} recurso(s)
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
                onClick={() => onVerDetalhes(processo)}
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
  );
};

interface InstanciaSectionProps {
  titulo: string;
  processos: ProcessoOAB[];
  droppableId: string;
  corBg: string;
  corBorder: string;
  corText: string;
  icon: React.ReactNode;
  onVerDetalhes: (processo: ProcessoOAB) => void;
  carregandoDetalhes: string | null;
}

const InstanciaSection = ({ 
  titulo, 
  processos, 
  droppableId,
  corBg, 
  corBorder,
  corText,
  icon, 
  onVerDetalhes,
  carregandoDetalhes
}: InstanciaSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  
  if (processos.length === 0) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <button 
          className={`w-full flex items-center gap-2 p-3 rounded-lg border ${corBg} ${corBorder} hover:opacity-90 transition-opacity`}
        >
          <span className={corText}>{icon}</span>
          <span className={`font-semibold ${corText}`}>{titulo}</span>
          <Badge variant="secondary" className="ml-auto mr-2">
            {processos.length} {processos.length === 1 ? 'processo' : 'processos'}
          </Badge>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${!isOpen ? '-rotate-90' : ''}`} />
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <Droppable droppableId={droppableId}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-2 pl-3 border-l-2 ${corBorder} ml-2`}
            >
              {processos.map((processo, index) => (
                <ProcessoCard 
                  key={processo.id}
                  processo={processo}
                  index={index}
                  onVerDetalhes={onVerDetalhes}
                  carregandoDetalhes={carregandoDetalhes}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </CollapsibleContent>
    </Collapsible>
  );
};

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

  const processosAgrupados = useMemo(() => agruparPorInstancia(processos), [processos]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;
    
    // Apenas permitir reordenacao dentro da mesma secao
    if (sourceId !== destId) return;

    // Determinar qual lista foi afetada
    let listaAfetada: ProcessoOAB[];
    if (sourceId === 'primeira-instancia') {
      listaAfetada = [...processosAgrupados.primeiraInstancia];
    } else if (sourceId === 'segunda-instancia') {
      listaAfetada = [...processosAgrupados.segundaInstancia];
    } else {
      listaAfetada = [...processosAgrupados.semInstancia];
    }

    // Reordenar dentro da lista
    const [reorderedItem] = listaAfetada.splice(result.source.index, 1);
    listaAfetada.splice(result.destination.index, 0, reorderedItem);

    // Reconstruir a lista completa mantendo a ordem das outras secoes
    const novaOrdem: ProcessoOAB[] = [];
    
    if (sourceId === 'primeira-instancia') {
      novaOrdem.push(...listaAfetada);
      novaOrdem.push(...processosAgrupados.segundaInstancia);
      novaOrdem.push(...processosAgrupados.semInstancia);
    } else if (sourceId === 'segunda-instancia') {
      novaOrdem.push(...processosAgrupados.primeiraInstancia);
      novaOrdem.push(...listaAfetada);
      novaOrdem.push(...processosAgrupados.semInstancia);
    } else {
      novaOrdem.push(...processosAgrupados.primeiraInstancia);
      novaOrdem.push(...processosAgrupados.segundaInstancia);
      novaOrdem.push(...listaAfetada);
    }

    atualizarOrdem(novaOrdem);
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

  const temProcessosAgrupados = 
    processosAgrupados.primeiraInstancia.length > 0 || 
    processosAgrupados.segundaInstancia.length > 0;

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {/* 1a Instancia */}
          <InstanciaSection
            titulo="1a Instancia"
            processos={processosAgrupados.primeiraInstancia}
            droppableId="primeira-instancia"
            corBg="bg-blue-50 dark:bg-blue-950/30"
            corBorder="border-blue-200 dark:border-blue-800"
            corText="text-blue-700 dark:text-blue-300"
            icon={<BookOpen className="w-5 h-5" />}
            onVerDetalhes={handleVerDetalhes}
            carregandoDetalhes={carregandoDetalhes}
          />

          {/* 2a Instancia */}
          <InstanciaSection
            titulo="2a Instancia"
            processos={processosAgrupados.segundaInstancia}
            droppableId="segunda-instancia"
            corBg="bg-green-50 dark:bg-green-950/30"
            corBorder="border-green-200 dark:border-green-800"
            corText="text-green-700 dark:text-green-300"
            icon={<BookUp className="w-5 h-5" />}
            onVerDetalhes={handleVerDetalhes}
            carregandoDetalhes={carregandoDetalhes}
          />

          {/* Processos sem instancia identificada */}
          {processosAgrupados.semInstancia.length > 0 && (
            <InstanciaSection
              titulo="Instancia nao identificada"
              processos={processosAgrupados.semInstancia}
              droppableId="sem-instancia"
              corBg="bg-muted/50"
              corBorder="border-muted-foreground/20"
              corText="text-muted-foreground"
              icon={<FileQuestion className="w-5 h-5" />}
              onVerDetalhes={handleVerDetalhes}
              carregandoDetalhes={carregandoDetalhes}
            />
          )}

          {/* Fallback se nenhum processo foi agrupado (todos sem instancia) */}
          {!temProcessosAgrupados && processosAgrupados.semInstancia.length === 0 && (
            <Droppable droppableId="processos-list">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {processos.map((processo, index) => (
                    <ProcessoCard 
                      key={processo.id}
                      processo={processo}
                      index={index}
                      onVerDetalhes={handleVerDetalhes}
                      carregandoDetalhes={carregandoDetalhes}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>
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
