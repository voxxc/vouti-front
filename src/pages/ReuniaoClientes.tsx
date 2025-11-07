import { useState } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar, Phone, Mail, MessageSquare, Eye } from 'lucide-react';
import { useReuniaoClientes } from '@/hooks/useReuniaoClientes';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ClienteDetalhesDialog } from '@/components/Reunioes/ClienteDetalhesDialog';

export default function ReuniaoClientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [showDetalhesDialog, setShowDetalhesDialog] = useState(false);
  
  const { clientes, loading, fetchClientes, deletarCliente } = useReuniaoClientes();

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefone?.includes(searchTerm) ||
    cliente.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVerDetalhes = (clienteId: string) => {
    setSelectedClienteId(clienteId);
    setShowDetalhesDialog(true);
  };

  const handleClienteDeleted = async (clienteId: string) => {
    const sucesso = await deletarCliente(clienteId);
    if (sucesso) {
      setShowDetalhesDialog(false);
      setSelectedClienteId(null);
      await fetchClientes();
    }
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
                          onClick={() => handleVerDetalhes(cliente.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
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

      <ClienteDetalhesDialog
        cliente={selectedCliente || null}
        open={showDetalhesDialog}
        onOpenChange={setShowDetalhesDialog}
        onUpdate={fetchClientes}
        onDelete={handleClienteDeleted}
      />
    </DashboardLayout>
  );
}
