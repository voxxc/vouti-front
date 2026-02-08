import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, User, Trash2, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CaptacaoSheet } from "@/components/CRM/CaptacaoSheet";
import { useToast } from "@/hooks/use-toast";
import { useClientes } from "@/hooks/useClientes";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { Cliente as ClienteType } from "@/types/cliente";

interface CRMContentProps {
  onViewCliente?: (clienteId: string) => void;
  onNewCliente?: () => void;
  clientes?: ClienteType[];
  onRefresh?: () => void;
}

export function CRMContent({ onViewCliente, onNewCliente, clientes: externalClientes, onRefresh }: CRMContentProps) {
  const navigate = useNavigate();
  const { tenantPath } = useTenantNavigation();
  const { toast } = useToast();
  const { fetchClientes, deleteCliente } = useClientes();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState("clientes");
  const [internalClientes, setInternalClientes] = useState<ClienteType[]>([]);

  // Use external clientes if provided, otherwise fetch internally
  const clientes = externalClientes || internalClientes;

  useEffect(() => {
    if (!externalClientes) {
      loadClientes();
    }
  }, [externalClientes]);

  const loadClientes = async () => {
    const data = await fetchClientes();
    setInternalClientes(data);
  };

  const handleNewCliente = () => {
    if (onNewCliente) {
      onNewCliente();
    } else {
      navigate(tenantPath('/crm/cliente/novo'));
    }
  };

  const handleViewCliente = (clienteId: string) => {
    if (onViewCliente) {
      onViewCliente(clienteId);
    } else {
      navigate(tenantPath(`/crm/cliente/${clienteId}`));
    }
  };

  const handleDeleteCliente = async (clienteId: string, nomeCliente: string) => {
    const success = await deleteCliente(clienteId);
    
    if (success) {
      toast({
        title: "Cliente excluído com sucesso",
        description: `${nomeCliente} e todos os registros financeiros foram removidos.`,
      });
      if (onRefresh) {
        onRefresh();
      } else {
        loadClientes();
      }
    }
  };

  const filteredClientes = clientes.filter(cliente => {
    const nome = cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || '';
    const email = cliente.email || '';
    const matchesSearch = nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || 
      (cliente.status_cliente || 'ativo') === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status?: string) => {
    const s = status || 'ativo';
    switch (s) {
      case 'ativo':
        return <Badge variant="default">Ativo</Badge>;
      case 'inativo':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'contrato_encerrado':
        return <Badge variant="destructive">Encerrado</Badge>;
      default:
        return <Badge variant="outline">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="clientes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Clientes
          </TabsTrigger>
          <TabsTrigger 
            value="captacao"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            CAPTAÇÃO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="space-y-4 mt-4">
          {/* Search and Filters */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
                <SelectItem value="contrato_encerrado">Encerrados</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="professional" size="sm" className="gap-2" onClick={handleNewCliente}>
              <Plus size={16} />
              Novo Cliente
            </Button>
          </div>

          {/* Client List */}
          {filteredClientes.length === 0 ? (
            <Card className="p-8 text-center">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.'}
              </p>
            </Card>
          ) : (
            <Card className="border-0 shadow-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => {
                    const nomeCliente = cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || 'Cliente';
                    return (
                      <TableRow key={cliente.id} className="group">
                        <TableCell>
                          <button
                            onClick={() => handleViewCliente(cliente.id)}
                            className="font-medium text-foreground hover:text-foreground/80 text-left transition-colors"
                          >
                            {nomeCliente}
                          </button>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cliente.telefone || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cliente.email || '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(cliente.status_cliente)}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertCircle className="h-5 w-5 text-destructive" />
                                  Confirmar Exclusão
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir <strong>{nomeCliente}</strong>?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteCliente(cliente.id, nomeCliente)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="captacao" className="mt-4">
          <CaptacaoSheet />
        </TabsContent>
      </Tabs>
    </div>
  );
}
