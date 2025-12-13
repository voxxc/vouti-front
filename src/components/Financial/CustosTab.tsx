import { useState } from 'react';
import { useCustos } from '@/hooks/useCustos';
import { Custo } from '@/types/financeiro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Eye, Edit, Settings, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CustoForm } from './CustoForm';
import { CustoCategoriaManager } from './CustoCategoriaManager';

export const CustosTab = () => {
  const { custos, categorias, loading } = useCustos();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [showForm, setShowForm] = useState(false);
  const [showCategorias, setShowCategorias] = useState(false);
  const [selectedCusto, setSelectedCusto] = useState<Custo | null>(null);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const custosFiltrados = custos.filter((c) => {
    const matchesSearch = searchTerm === '' || 
      c.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
    const matchesCategoria = categoriaFilter === 'todos' || c.categoria_id === categoriaFilter;
    const matchesTipo = tipoFilter === 'todos' || c.tipo === tipoFilter;
    
    return matchesSearch && matchesStatus && matchesCategoria && matchesTipo;
  });

  // Calculos
  const totalPendente = custosFiltrados
    .filter(c => c.status === 'pendente')
    .reduce((sum, c) => sum + c.valor, 0);

  const totalPago = custosFiltrados
    .filter(c => c.status === 'pago')
    .reduce((sum, c) => sum + c.valor, 0);

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
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total Pendente</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalPendente)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total Pago (periodo)</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalPago)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex-1 flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="fixo">Fixo</SelectItem>
              <SelectItem value="variavel">Variavel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCategorias(true)} className="gap-2">
            <Settings size={16} />
            Categorias
          </Button>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus size={16} />
            Novo Custo
          </Button>
        </div>
      </div>

      {/* Table */}
      {custosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'todos' || categoriaFilter !== 'todos'
                ? 'Nenhum custo encontrado com os filtros selecionados'
                : 'Nenhum custo cadastrado'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descricao</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {custosFiltrados.map((custo) => (
                <TableRow key={custo.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {custo.descricao}
                      {custo.recorrente && (
                        <Badge variant="outline" className="text-xs">Recorrente</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {custo.categoria && (
                      <Badge 
                        variant="outline"
                        style={{ borderColor: custo.categoria.cor, color: custo.categoria.cor }}
                      >
                        {custo.categoria.nome}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(custo.valor)}</TableCell>
                  <TableCell>
                    <Badge variant={custo.tipo === 'fixo' ? 'default' : 'secondary'}>
                      {custo.tipo === 'fixo' ? 'Fixo' : 'Variavel'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(custo.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {custo.forma_pagamento || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={custo.status === 'pago' ? 'default' : 'destructive'}>
                      {custo.status === 'pago' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setSelectedCusto(custo);
                          setShowForm(true);
                        }}
                      >
                        <Edit size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Form Dialog */}
      <CustoForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setSelectedCusto(null);
        }}
        custo={selectedCusto}
        categorias={categorias}
      />

      {/* Categorias Manager */}
      <CustoCategoriaManager
        open={showCategorias}
        onOpenChange={setShowCategorias}
      />
    </div>
  );
};
