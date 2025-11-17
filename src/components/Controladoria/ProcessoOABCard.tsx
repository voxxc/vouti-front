import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ProcessoOAB } from "@/types/busca-oab";

interface ProcessoOABCardProps {
  processo: ProcessoOAB;
  onImportar: () => void;
  onVerDetalhes: () => void;
}

export const ProcessoOABCard = ({ processo, onImportar, onVerDetalhes }: ProcessoOABCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const getParteTipoBadge = (tipo: string) => {
    const badges = {
      autor: { variant: "default" as const, label: "Autor" },
      reu: { variant: "destructive" as const, label: "Réu" },
      advogado: { variant: "secondary" as const, label: "Advogado" }
    };
    return badges[tipo as keyof typeof badges] || badges.advogado;
  };

  const parteBadge = getParteTipoBadge(processo.parte_tipo);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg font-semibold">
              {processo.numero_cnj}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant={parteBadge.variant}>
                {parteBadge.label}
              </Badge>
              <Badge variant="outline">
                {processo.tribunal_acronym || processo.tribunal}
              </Badge>
              {processo.status_processual && (
                <Badge variant="outline" className="bg-muted">
                  {processo.status_processual}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onVerDetalhes}
            >
              <Eye className="h-4 w-4 mr-1" />
              Detalhes
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onImportar}
            >
              <Download className="h-4 w-4 mr-1" />
              Importar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Informações adicionais */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {processo.data_distribuicao && (
            <div>
              <span className="text-muted-foreground">Distribuição:</span>{' '}
              <span className="font-medium">
                {format(new Date(processo.data_distribuicao), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          )}
          {processo.valor_causa && (
            <div>
              <span className="text-muted-foreground">Valor:</span>{' '}
              <span className="font-medium">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(processo.valor_causa)}
              </span>
            </div>
          )}
          {processo.fase_processual && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Fase:</span>{' '}
              <span className="font-medium">{processo.fase_processual}</span>
            </div>
          )}
        </div>

        {/* Últimos andamentos */}
        {processo.ultimos_andamentos && processo.ultimos_andamentos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                Últimos Andamentos ({processo.ultimos_andamentos.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-6 px-2"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Recolher
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Expandir
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              {processo.ultimos_andamentos
                .slice(0, expanded ? undefined : 3)
                .map((andamento, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                  >
                    <div className="flex-shrink-0 text-muted-foreground font-medium min-w-[80px]">
                      {andamento.data_movimentacao
                        ? format(new Date(andamento.data_movimentacao), "dd/MM/yy", { locale: ptBR })
                        : '-'}
                    </div>
                    <div className="flex-1">
                      {andamento.tipo_movimentacao && (
                        <div className="font-medium text-foreground">
                          {andamento.tipo_movimentacao}
                        </div>
                      )}
                      <div className="text-muted-foreground line-clamp-2">
                        {andamento.descricao}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
