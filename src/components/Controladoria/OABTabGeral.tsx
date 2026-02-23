import { useState, useMemo } from 'react';
import { Search, X, Eye, Loader2, Bell, AlertCircle, ChevronDown, FileText, BookOpen, BookUp, FileQuestion, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProcessoOAB } from '@/hooks/useOABs';
import { ProcessoOABDetalhes } from './ProcessoOABDetalhes';
import { useProcessosGeral } from '@/hooks/useProcessosGeral';

// Mapa de codigos de tribunal CNJ para UF
const TRIBUNAL_UF_MAP: Record<string, string> = {
  '01': 'AC', '02': 'AL', '03': 'AP', '04': 'AM', '05': 'BA',
  '06': 'CE', '07': 'DF', '08': 'ES', '09': 'GO', '10': 'MA',
  '11': 'MT', '12': 'MS', '13': 'MG', '14': 'PA', '15': 'PB',
  '16': 'PR', '17': 'PE', '18': 'PI', '19': 'RJ', '20': 'RN',
  '21': 'RS', '22': 'RO', '23': 'RR', '24': 'SC', '25': 'SE',
  '26': 'SP', '27': 'TO',
};

const extrairUF = (tribunalSigla: string | null | undefined, numeroCnj?: string | null): string => {
  if (tribunalSigla) {
    const matchTJ = tribunalSigla.match(/TJ([A-Z]{2})/);
    if (matchTJ) return matchTJ[1];
  }
  if (numeroCnj) {
    const match = numeroCnj.match(/\.\d{4}\.(\d)\.(\d{2})\./);
    if (match) {
      const segmento = match[1];
      const codigoTribunal = match[2];
      if (segmento === '8' && TRIBUNAL_UF_MAP[codigoTribunal]) {
        return TRIBUNAL_UF_MAP[codigoTribunal];
      }
      return `${segmento}.${codigoTribunal}`;
    }
  }
  return 'N/I';
};

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
    if (instance === 1) primeiraInstancia.push(processo);
    else if (instance === 2) segundaInstancia.push(processo);
    else semInstancia.push(processo);
  });
  
  return { primeiraInstancia, segundaInstancia, semInstancia };
};

const ProcessoCardGeral = ({ processo, onVerDetalhes }: { processo: ProcessoOAB; onVerDetalhes: (p: ProcessoOAB) => void }) => {
  return (
    <Card className="p-3 transition-shadow">
      <div className="flex items-center gap-3 w-full overflow-hidden pr-2">
        <div className="flex-1 min-w-0 overflow-hidden">
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
          </div>
          <p className="text-sm text-muted-foreground truncate max-w-full">
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

        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onVerDetalhes(processo)}
          >
            <Eye className="w-4 h-4 mr-1" />
            Detalhes
          </Button>
        </div>
      </div>
    </Card>
  );
};

const InstanciaSectionGeral = ({ 
  titulo, processos, corBg, corBorder, corText, icon, onVerDetalhes 
}: { 
  titulo: string; processos: ProcessoOAB[]; corBg: string; corBorder: string; corText: string; icon: React.ReactNode; onVerDetalhes: (p: ProcessoOAB) => void;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  if (processos.length === 0) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <button className={`w-full flex items-center gap-2 p-3 rounded-lg border ${corBg} ${corBorder} hover:opacity-90 transition-opacity`}>
          <span className={corText}>{icon}</span>
          <span className={`font-semibold ${corText}`}>{titulo}</span>
          <Badge variant="secondary" className="ml-auto mr-2">
            {processos.length} {processos.length === 1 ? 'processo' : 'processos'}
          </Badge>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${!isOpen ? '-rotate-90' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={`space-y-2 pl-3 border-l-2 ${corBorder} ml-2`}>
          {processos.map((processo) => (
            <ProcessoCardGeral key={processo.id} processo={processo} onVerDetalhes={onVerDetalhes} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const OABTabGeral = () => {
  const { processos, loading } = useProcessosGeral();
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoOAB | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtroUF, setFiltroUF] = useState<string>('todos');
  const [termoBusca, setTermoBusca] = useState<string>('');

  const naoLidosCount = useMemo(() => processos.filter(p => (p.andamentos_nao_lidos || 0) > 0).length, [processos]);
  const monitoradosCount = useMemo(() => processos.filter(p => p.monitoramento_ativo === true).length, [processos]);

  const ufsDisponiveis = useMemo(() => {
    const ufMap = new Map<string, number>();
    processos.forEach(p => {
      const uf = extrairUF(p.tribunal_sigla, p.numero_cnj);
      ufMap.set(uf, (ufMap.get(uf) || 0) + 1);
    });
    return Array.from(ufMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([uf, count]) => ({ uf, count }));
  }, [processos]);

  const processosFiltrados = useMemo(() => {
    let resultado = processos;
    
    if (filtroUF === 'nao-lidos') {
      resultado = resultado.filter(p => (p.andamentos_nao_lidos || 0) > 0);
    } else if (filtroUF === 'monitorados') {
      resultado = resultado.filter(p => p.monitoramento_ativo === true);
    } else if (filtroUF !== 'todos') {
      resultado = resultado.filter(p => extrairUF(p.tribunal_sigla, p.numero_cnj) === filtroUF);
    }
    
    if (termoBusca.trim()) {
      const termo = termoBusca.toLowerCase().trim();
      resultado = resultado.filter(p => 
        p.numero_cnj?.toLowerCase().includes(termo) ||
        p.parte_ativa?.toLowerCase().includes(termo) ||
        p.parte_passiva?.toLowerCase().includes(termo) ||
        p.tribunal_sigla?.toLowerCase().includes(termo)
      );
    }
    
    return resultado;
  }, [processos, filtroUF, termoBusca]);

  const processosAgrupados = useMemo(() => agruparPorInstancia(processosFiltrados), [processosFiltrados]);

  const handleVerDetalhes = (processo: ProcessoOAB) => {
    setSelectedProcesso(processo);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por CNJ, partes ou tribunal..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="pl-9 pr-9"
          />
          {termoBusca && (
            <button
              onClick={() => setTermoBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <Select value={filtroUF} onValueChange={setFiltroUF}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos ({processos.length})</SelectItem>
            {naoLidosCount > 0 && (
              <SelectItem value="nao-lidos">Nao lidos ({naoLidosCount})</SelectItem>
            )}
            {monitoradosCount > 0 && (
              <SelectItem value="monitorados">Monitorados ({monitoradosCount})</SelectItem>
            )}
            {ufsDisponiveis.map(({ uf, count }) => (
              <SelectItem key={uf} value={uf}>{uf} ({count})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {termoBusca && (
        <p className="text-sm text-muted-foreground">
          {processosFiltrados.length} resultado(s) encontrado(s)
        </p>
      )}

      {/* Process list */}
      {processosFiltrados.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{termoBusca ? 'Nenhum processo encontrado para esta pesquisa' : 'Nenhum processo cadastrado'}</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-380px)]">
          <div className="space-y-4 pr-4">
            <InstanciaSectionGeral
              titulo="1ª Instância"
              processos={processosAgrupados.primeiraInstancia}
              corBg="bg-blue-50 dark:bg-blue-950/30"
              corBorder="border-blue-200 dark:border-blue-800"
              corText="text-blue-700 dark:text-blue-300"
              icon={<BookOpen className="w-5 h-5" />}
              onVerDetalhes={handleVerDetalhes}
            />
            <InstanciaSectionGeral
              titulo="2ª Instância"
              processos={processosAgrupados.segundaInstancia}
              corBg="bg-amber-50 dark:bg-amber-950/30"
              corBorder="border-amber-200 dark:border-amber-800"
              corText="text-amber-700 dark:text-amber-300"
              icon={<BookUp className="w-5 h-5" />}
              onVerDetalhes={handleVerDetalhes}
            />
            <InstanciaSectionGeral
              titulo="Sem Instância Definida"
              processos={processosAgrupados.semInstancia}
              corBg="bg-gray-50 dark:bg-gray-950/30"
              corBorder="border-gray-200 dark:border-gray-800"
              corText="text-gray-700 dark:text-gray-300"
              icon={<FileQuestion className="w-5 h-5" />}
              onVerDetalhes={handleVerDetalhes}
            />
          </div>
        </ScrollArea>
      )}

      {/* Drawer de detalhes */}
      {selectedProcesso && (
        <ProcessoOABDetalhes
          processo={selectedProcesso}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onToggleMonitoramento={async () => {}}
        />
      )}
    </div>
  );
};
