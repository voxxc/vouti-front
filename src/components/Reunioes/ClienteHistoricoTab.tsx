import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReuniaoClientes } from '@/hooks/useReuniaoClientes';
import { Calendar, Clock, MessageSquare, XCircle, CalendarClock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClienteHistoricoTabProps {
  clienteId: string;
}

export const ClienteHistoricoTab = ({ clienteId }: ClienteHistoricoTabProps) => {
  const [historicoReunioes, setHistoricoReunioes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { obterHistoricoReunioesCliente } = useReuniaoClientes();

  useEffect(() => {
    loadHistorico();
  }, [clienteId]);

  const loadHistorico = async () => {
    setLoading(true);
    const historico = await obterHistoricoReunioesCliente(clienteId);
    setHistoricoReunioes(historico);
    setLoading(false);
  };

  const getSituacaoBadge = (situacao?: string) => {
    if (!situacao || situacao === 'ativa') {
      return (
        <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          Realizada
        </Badge>
      );
    }
    if (situacao === 'desmarcada') {
      return (
        <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400">
          <XCircle className="h-3 w-3 mr-1" />
          Desmarcada
        </Badge>
      );
    }
    if (situacao === 'remarcada') {
      return (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
          <CalendarClock className="h-3 w-3 mr-1" />
          Remarcada
        </Badge>
      );
    }
    return null;
  };

  return (
    <ScrollArea className="h-[500px] pr-4">
      {loading ? (
        <p className="text-center py-8 text-muted-foreground">
          Carregando histórico...
        </p>
      ) : historicoReunioes.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">
          Nenhuma reunião encontrada
        </p>
      ) : (
        <div className="space-y-4">
          {historicoReunioes.map((reuniao) => (
            <Card key={reuniao.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-lg">{reuniao.titulo}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{reuniao.status}</Badge>
                      {getSituacaoBadge(reuniao.situacao_agenda)}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(reuniao.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{reuniao.horario} • {reuniao.duracao_minutos} minutos</span>
                    </div>
                  </div>

                  {reuniao.descricao && (
                    <p className="text-sm">{reuniao.descricao}</p>
                  )}

                  {reuniao.observacoes && (
                    <div className="p-3 bg-muted/50 rounded-md">
                      <p className="text-sm text-muted-foreground">
                        <strong>Observações:</strong> {reuniao.observacoes}
                      </p>
                    </div>
                  )}

                  {reuniao.motivo_alteracao && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                      <p className="text-sm">
                        <strong className="text-amber-700 dark:text-amber-400">
                          Motivo da {reuniao.situacao_agenda}:
                        </strong>{' '}
                        <span className="text-muted-foreground">{reuniao.motivo_alteracao}</span>
                      </p>
                      {reuniao.data_alteracao_situacao && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(reuniao.data_alteracao_situacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  )}

                  {reuniao.reuniao_comentarios?.length > 0 && (
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span>Comentários ({reuniao.reuniao_comentarios.length})</span>
                      </div>
                      <div className="space-y-2 pl-6">
                        {reuniao.reuniao_comentarios.map((comentario: any) => (
                          <div key={comentario.id} className="text-sm p-2 bg-muted/30 rounded">
                            <p>{comentario.comentario}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(comentario.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ScrollArea>
  );
};
