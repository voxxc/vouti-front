import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReuniaoClientes } from '@/hooks/useReuniaoClientes';
import { Calendar, Clock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
                    <Badge variant="secondary">{reuniao.status}</Badge>
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
