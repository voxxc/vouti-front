import { useState } from 'react';
import { useColaboradores } from '@/hooks/useColaboradores';
import { Colaborador } from '@/types/financeiro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Eye, Edit, Users, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ColaboradorForm } from './ColaboradorForm';
import { ColaboradorDetalhes } from './ColaboradorDetalhes';
import { FolhaPagamentoCard } from './FolhaPagamentoCard';

export const ColaboradoresTab = () => {
  const { colaboradores, loading, deleteColaborador, fetchColaboradores } = useColaboradores();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [vinculoFilter, setVinculoFilter] = useState<string>('todos');
  const [showForm, setShowForm] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState<Colaborador | null>(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [colaboradorParaExcluir, setColaboradorParaExcluir] = useState<Colaborador | null>(null);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const colaboradoresFiltrados = colaboradores.filter((c) => {
    const matchesSearch = searchTerm === '' || 
      c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf_cnpj?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
    const matchesVinculo = vinculoFilter === 'todos' || c.tipo_vinculo === vinculoFilter;
    
    return matchesSearch && matchesStatus && matchesVinculo;
  });

  const getVinculoBadge = (vinculo?: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      CLT: { variant: 'default', label: 'CLT' },
      PJ: { variant: 'secondary', label: 'PJ' },
      Estagio: { variant: 'outline', label: 'Estagio' },
      Freelancer: { variant: 'outline', label: 'Freelancer' },
    };
    return variants[vinculo || ''] || { variant: 'outline', label: vinculo || '-' };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card de Folha de Pagamento */}
      <FolhaPagamentoCard />

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex-1 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, cargo ou CPF/CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={vinculoFilter} onValueChange={setVinculoFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Vinculo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="CLT">CLT</SelectItem>
              <SelectItem value="PJ">PJ</SelectItem>
              <SelectItem value="Estagio">Estagio</SelectItem>
              <SelectItem value="Freelancer">Freelancer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus size={16} />
          Novo Colaborador
        </Button>
      </div>

      {/* Table */}
      {colaboradoresFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'todos' || vinculoFilter !== 'todos'
                ? 'Nenhum colaborador encontrado com os filtros selecionados'
                : 'Nenhum colaborador cadastrado'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Vinculo</TableHead>
                <TableHead>Salario</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contratacao</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colaboradoresFiltrados.map((colaborador) => {
                const vinculoConfig = getVinculoBadge(colaborador.tipo_vinculo);
                return (
                  <TableRow key={colaborador.id}>
                    <TableCell className="font-medium">{colaborador.nome_completo}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{colaborador.tipo_pessoa}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{colaborador.cpf_cnpj || '-'}</TableCell>
                    <TableCell>{colaborador.cargo || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={vinculoConfig.variant}>{vinculoConfig.label}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(colaborador.salario_base)}</TableCell>
                    <TableCell>
                      <Badge variant={colaborador.status === 'ativo' ? 'default' : 'secondary'}>
                        {colaborador.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {colaborador.data_contratacao 
                        ? format(new Date(colaborador.data_contratacao), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedColaborador(colaborador);
                            setShowDetalhes(true);
                          }}
                        >
                          <Eye size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedColaborador(colaborador);
                            setShowForm(true);
                          }}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setColaboradorParaExcluir(colaborador)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Form Dialog */}
      <ColaboradorForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setSelectedColaborador(null);
        }}
        colaborador={selectedColaborador}
      />

      {/* Detalhes Drawer */}
      {selectedColaborador && (
        <ColaboradorDetalhes
          open={showDetalhes}
          onOpenChange={(open) => {
            setShowDetalhes(open);
            if (!open) setSelectedColaborador(null);
          }}
          colaborador={selectedColaborador}
        />
      )}

      {/* Dialog de confirmacao de exclusao */}
      <AlertDialog open={!!colaboradorParaExcluir} onOpenChange={(open) => !open && setColaboradorParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Colaborador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{colaboradorParaExcluir?.nome_completo}</strong>?
              Esta acao nao pode ser desfeita e todos os dados relacionados serao removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (colaboradorParaExcluir) {
                  await deleteColaborador(colaboradorParaExcluir.id);
                  await fetchColaboradores();
                  setColaboradorParaExcluir(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
