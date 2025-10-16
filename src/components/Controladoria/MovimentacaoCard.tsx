import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Circle, AlertCircle, User, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MovimentacaoComConferencia } from '@/types/movimentacao';

interface MovimentacaoCardProps {
  movimentacao: MovimentacaoComConferencia;
  onMarcarConferido: (id: string, observacoes?: string) => void;
  onMarcarRevisao: (id: string) => void;
  isController: boolean;
}

const MovimentacaoCard = ({ movimentacao, onMarcarConferido, onMarcarRevisao, isController }: MovimentacaoCardProps) => {
  const [observacoes, setObservacoes] = useState('');
  const [showObservacoes, setShowObservacoes] = useState(false);
  const [showTextoCompleto, setShowTextoCompleto] = useState(false);
  const [loading, setLoading] = useState(false);

  const getStatusIcon = () => {
    switch (movimentacao.status_conferencia) {
      case 'conferido':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'em_revisao':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Circle className="h-5 w-5 text-red-600 fill-red-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (movimentacao.status_conferencia) {
      case 'conferido':
        return <Badge variant="default" className="bg-green-600">✅ Conferido</Badge>;
      case 'em_revisao':
        return <Badge variant="default" className="bg-yellow-600">⚠️ Em Revisão</Badge>;
      default:
        return <Badge variant="destructive" className="animate-pulse">🔴 Pendente</Badge>;
    }
  };

  const handleMarcarConferido = async () => {
    setLoading(true);
    await onMarcarConferido(movimentacao.id, observacoes);
    setLoading(false);
    setObservacoes('');
    setShowObservacoes(false);
  };

  const handleMarcarRevisao = async () => {
    setLoading(true);
    await onMarcarRevisao(movimentacao.id);
    setLoading(false);
  };

  return (
    <Card className={`${movimentacao.status_conferencia === 'pendente' ? 'border-red-200 dark:border-red-900' : ''}`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge()}
                  {movimentacao.is_automated && (
                    <>
                      <Badge variant="outline" className="text-xs">
                        Automático
                      </Badge>
                      {movimentacao.metadata?.fonte && (
                        <Badge variant="outline" className="text-xs">
                          {movimentacao.metadata.fonte === 'datajud_api' 
                            ? '📊 DataJud API' 
                            : '🌐 PJe Comunicações'
                          }
                        </Badge>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(movimentacao.data_movimentacao), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="pl-8 space-y-3">
            <div>
              <p className="text-sm leading-relaxed">{movimentacao.descricao}</p>
            </div>
            
            {/* Texto Completo (se disponível) */}
            {movimentacao.metadata?.texto_completo && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <strong className="text-sm font-semibold">Inteiro Teor</strong>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTextoCompleto(!showTextoCompleto)}
                    className="h-7"
                  >
                    {showTextoCompleto ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Ver Texto Completo
                      </>
                    )}
                  </Button>
                </div>
                
                {showTextoCompleto && (
                  <div className="p-3 bg-muted/50 rounded-md max-h-96 overflow-y-auto">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {movimentacao.metadata.texto_completo}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {!movimentacao.metadata?.texto_completo && movimentacao.is_automated && (
              <div className="text-xs text-muted-foreground italic">
                ℹ️ Texto completo não disponível para este andamento
              </div>
            )}
          </div>

          {/* Informações de conferência */}
          {movimentacao.conferencia && (
            <div className="pl-8 pt-3 border-t">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  <span>
                    Conferido por: {movimentacao.conferencia.usuario?.full_name || 'Usuário'} em {' '}
                    {format(new Date(movimentacao.conferencia.conferido_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {movimentacao.conferencia.observacoes_conferencia && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <strong>Observações:</strong> {movimentacao.conferencia.observacoes_conferencia}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ações (apenas para controllers e se pendente ou em revisão) */}
          {isController && movimentacao.status_conferencia !== 'conferido' && (
            <div className="pl-8 pt-3 border-t space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowObservacoes(!showObservacoes)}
                  variant="outline"
                >
                  {showObservacoes ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Adicionar Observações
                    </>
                  )}
                </Button>
              </div>

              {showObservacoes && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Observações sobre este andamento (opcional)"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="text-sm"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleMarcarConferido}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Marcar como Conferido
                </Button>
                {movimentacao.status_conferencia === 'pendente' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarcarRevisao}
                    disabled={loading}
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Em Revisão
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MovimentacaoCard;
