import { useState, useMemo } from 'react';
import { FileText, ExternalLink, Bell, BellOff, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProcessosCNPJ, ProcessoCNPJ } from '@/hooks/useCNPJs';
import { ProcessoCNPJDetalhes } from './ProcessoCNPJDetalhes';

interface CNPJTabProps {
  cnpjId: string;
}

const TRIBUNAL_UF_MAP: Record<string, string> = {
  '01': 'AC', '02': 'AL', '03': 'AP', '04': 'AM', '05': 'BA',
  '06': 'CE', '07': 'DF', '08': 'ES', '09': 'GO', '10': 'MA',
  '11': 'MT', '12': 'MS', '13': 'MG', '14': 'PA', '15': 'PB',
  '16': 'PR', '17': 'PE', '18': 'PI', '19': 'RJ', '20': 'RN',
  '21': 'RS', '22': 'RO', '23': 'RR', '24': 'SC', '25': 'SE',
  '26': 'SP', '27': 'TO',
};

export const CNPJTab = ({ cnpjId }: CNPJTabProps) => {
  const { processos, loading, fetchProcessos } = useProcessosCNPJ(cnpjId);
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoCNPJ | null>(null);
  const [expandedInstances, setExpandedInstances] = useState<Record<string, boolean>>({
    '1': true,
    '2': true,
    'unknown': true,
  });

  // Extrair UF do CNJ
  const getUfFromCnj = (cnj: string): string => {
    const parts = cnj.replace(/\D/g, '');
    if (parts.length >= 13) {
      const tribunalCode = parts.substring(11, 13);
      return TRIBUNAL_UF_MAP[tribunalCode] || 'N/A';
    }
    return 'N/A';
  };

  // Agrupar por instancia
  const processosPorInstancia = useMemo(() => {
    const groups: Record<string, ProcessoCNPJ[]> = {
      '1': [],
      '2': [],
      'unknown': [],
    };

    processos.forEach((p) => {
      const instancia = p.capaCompleta?.instance || p.instancia;
      if (instancia === '1' || instancia === 1) {
        groups['1'].push(p);
      } else if (instancia === '2' || instancia === 2) {
        groups['2'].push(p);
      } else {
        groups['unknown'].push(p);
      }
    });

    return groups;
  }, [processos]);

  const toggleInstance = (instance: string) => {
    setExpandedInstances((prev) => ({
      ...prev,
      [instance]: !prev[instance],
    }));
  };

  const formatValor = (valor: number | null) => {
    if (!valor) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (processos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhum processo encontrado</h3>
        <p className="text-muted-foreground">
          Sincronize o CNPJ para buscar processos
        </p>
      </div>
    );
  }

  const renderProcessoCard = (processo: ProcessoCNPJ) => {
    const uf = getUfFromCnj(processo.numeroCnj);

    return (
      <Card
        key={processo.id}
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setSelectedProcesso(processo)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm font-medium">
                  {processo.numeroCnj}
                </span>
                <Badge variant="outline" className="text-xs">
                  {uf}
                </Badge>
                {processo.andamentosNaoLidos && processo.andamentosNaoLidos > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {processo.andamentosNaoLidos} novo(s)
                  </Badge>
                )}
              </div>

              <div className="text-sm text-muted-foreground mb-1">
                {processo.parteAtiva && processo.partePassiva ? (
                  <span>
                    {processo.parteAtiva.substring(0, 40)}
                    {processo.parteAtiva.length > 40 ? '...' : ''} X{' '}
                    {processo.partePassiva.substring(0, 40)}
                    {processo.partePassiva.length > 40 ? '...' : ''}
                  </span>
                ) : (
                  <span className="italic">Partes nao informadas</span>
                )}
              </div>

              {processo.tribunal && (
                <div className="text-xs text-muted-foreground">
                  {processo.tribunal}
                </div>
              )}

              {processo.valorCausa && (
                <div className="text-xs text-muted-foreground mt-1">
                  Valor: {formatValor(processo.valorCausa)}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              {processo.monitoramentoAtivo ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <Bell className="h-3 w-3" />
                  Monitorado
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <BellOff className="h-3 w-3" />
                  Inativo
                </Badge>
              )}

              {processo.linkTribunal && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(processo.linkTribunal!, '_blank');
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Tribunal
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderInstanceSection = (instance: string, label: string, borderColor: string) => {
    const processosInstancia = processosPorInstancia[instance];
    if (processosInstancia.length === 0) return null;

    return (
      <Collapsible
        key={instance}
        open={expandedInstances[instance]}
        onOpenChange={() => toggleInstance(instance)}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-between p-3 border-l-4 ${borderColor} bg-muted/30 hover:bg-muted/50`}
          >
            <span className="font-medium">
              {label} ({processosInstancia.length})
            </span>
            {expandedInstances[instance] ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {processosInstancia.map(renderProcessoCard)}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-4">
      {renderInstanceSection('1', '1a Instancia', 'border-blue-500')}
      {renderInstanceSection('2', '2a Instancia', 'border-green-500')}
      {renderInstanceSection('unknown', 'Instancia nao identificada', 'border-gray-500')}

      {selectedProcesso && (
        <ProcessoCNPJDetalhes
          processo={selectedProcesso}
          open={!!selectedProcesso}
          onClose={() => setSelectedProcesso(null)}
          onUpdate={fetchProcessos}
        />
      )}
    </div>
  );
};
