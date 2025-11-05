import { useState } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar, Phone, Mail, MessageSquare } from 'lucide-react';
import { useReuniaoClientes } from '@/hooks/useReuniaoClientes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ReuniaoClientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [historicoReunioes, setHistoricoReunioes] = useState<any[]>([]);
  const [showHistoricoDialog, setShowHistoricoDialog] = useState(false);
  
  const { clientes, loading, obterHistoricoReunioesCliente } = useReuniaoClientes();

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefone?.includes(searchTerm) ||
    cliente.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVerHistorico = async (clienteId: string) => {
    setSelectedClienteId(clienteId);
    const historico = await obterHistoricoReunioesCliente(clienteId);
    setHistoricoReunioes(historico);
    setShowHistoricoDialog(true);
  };

  const selectedCliente = clientes.find(c => c.id === selectedClienteId);

  return (
    <DashboardLayout currentPage="reunioes">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clientes de Reunião</h1>
            <p className="text-muted-foreground">
              Gerencie e consulte o histórico de clientes
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando clientes...</p>
            ) : clientesFiltrados.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Nenhum cliente encontrado
              </p>
            ) : (
              <div className="space-y-2">
                {clientesFiltrados.map((cliente) => (
                  <Card key={cliente.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{cliente.nome}</h3>
                            <Badge variant="secondary">
                              {cliente.total_reunioes || 0} reuniões
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {cliente.telefone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                <span>{cliente.telefone}</span>
                              </div>
                            )}
                            {cliente.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                <span>{cliente.email}</span>
                              </div>
                            )}
                            {cliente.ultima_reuniao && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Última reunião:{' '}
                                  {format(new Date(cliente.ultima_reuniao), 'dd/MM/yyyy')}
                                </span>
                              </div>
                            )}
                          </div>
                          {cliente.observacoes && (
                            <div className="flex items-start gap-1 text-sm">
                              <MessageSquare className="h-4 w-4 mt-0.5" />
                              <p className="text-muted-foreground">{cliente.observacoes}</p>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleVerHistorico(cliente.id)}
                        >
                          Ver Histórico
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showHistoricoDialog} onOpenChange={setShowHistoricoDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Histórico de Reuniões - {selectedCliente?.nome}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {historicoReunioes.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Nenhuma reunião encontrada
              </p>
            ) : (
              <div className="space-y-4">
                {historicoReunioes.map((reuniao) => (
                  <Card key={reuniao.id}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{reuniao.titulo}</h4>
                          <Badge variant="secondary">{reuniao.status}</Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>
                            {format(new Date(reuniao.data + ' ' + reuniao.horario), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR
                            })}
                          </span>
                          <span>{reuniao.duracao_minutos} minutos</span>
                        </div>
                        {reuniao.descricao && (
                          <p className="text-sm">{reuniao.descricao}</p>
                        )}
                        {reuniao.reuniao_comentarios?.length > 0 && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Comentários ({reuniao.reuniao_comentarios.length})
                            </p>
                            {reuniao.reuniao_comentarios.slice(0, 2).map((comentario: any) => (
                              <div key={comentario.id} className="text-sm pl-4 border-l-2">
                                {comentario.comentario}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
