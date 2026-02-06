import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Search, Plus, User, Trash2, AlertCircle } from 'lucide-react';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import { useClientes } from '@/hooks/useClientes';
import { useToast } from '@/hooks/use-toast';
import { Cliente } from '@/types/cliente';

interface ClientesListaProps {
  clientes: Cliente[];
  onClienteDeleted: () => void;
}

export const ClientesLista = ({ clientes, onClienteDeleted }: ClientesListaProps) => {
  const navigate = useNavigate();
  const { tenantPath } = useTenantNavigation();
  const { deleteCliente } = useClientes();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  
  const filteredClientes = clientes.filter(cliente => {
    const nome = cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || '';
    const email = cliente.email || '';
    const matchesSearch = nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || 
      (cliente.status_cliente || 'ativo') === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  const handleNavigateToCliente = (clienteId: string) => {
    navigate(tenantPath(`/crm/cliente/${clienteId}`));
  };
  
  const handleNavigateToNewCliente = () => {
    navigate(tenantPath('/crm/cliente/novo'));
  };
  
  const handleDeleteCliente = async (clienteId: string, nomeCliente: string) => {
    const success = await deleteCliente(clienteId);
    
    if (success) {
      toast({
        title: 'Cliente excluído',
        description: `${nomeCliente} foi removido com sucesso.`,
      });
      onClienteDeleted();
    }
  };
  
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ativo':
      case undefined:
        return <Badge variant="default">✅ Ativo</Badge>;
      case 'inativo':
        return <Badge variant="secondary">⏸️ Inativo</Badge>;
      case 'contrato_encerrado':
        return <Badge variant="outline" className="border-destructive/30 text-destructive">🔒 Encerrado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Busca e Filtros */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">✅ Ativos</SelectItem>
            <SelectItem value="inativo">⏸️ Inativos</SelectItem>
            <SelectItem value="contrato_encerrado">🔒 Encerrado</SelectItem>
          </SelectContent>
        </Select>
        
        <Button onClick={handleNavigateToNewCliente} className="gap-2">
          <Plus size={16} />
          Novo Cliente
        </Button>
      </div>
      
      {/* Lista */}
      {filteredClientes.length === 0 ? (
        <Card className="p-8 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {searchTerm 
              ? 'Nenhum cliente encontrado para esta busca' 
              : 'Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.'}
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.map((cliente) => {
                const nomeCliente = cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || 'Sem nome';
                return (
                  <TableRow key={cliente.id} className="group">
                    <TableCell>
                      <button
                        onClick={() => handleNavigateToCliente(cliente.id)}
                        className="font-medium text-foreground hover:text-foreground/80 text-left transition-colors"
                      >
                        {nomeCliente}
                      </button>
                      {cliente.email && (
                        <p className="text-xs text-muted-foreground mt-0.5">{cliente.email}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cliente.telefone || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(cliente.status_cliente)}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
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
                              <br />
                              Esta ação é irreversível e removerá todos os dados relacionados.
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
      
      {/* Contador */}
      <p className="text-sm text-muted-foreground">
        {filteredClientes.length} {filteredClientes.length === 1 ? 'cliente' : 'clientes'} encontrado(s)
      </p>
    </div>
  );
};
