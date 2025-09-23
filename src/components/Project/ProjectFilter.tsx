import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";

interface FilterOptions {
  searchTerm: string;
  status: 'all' | 'waiting' | 'todo' | 'progress' | 'done';
  client: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
}

interface ProjectFilterProps {
  onApplyFilters: (filters: FilterOptions) => void;
  clients: string[];
}

const ProjectFilter = ({ onApplyFilters, clients }: ProjectFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    status: 'all',
    client: '',
    dateRange: 'all'
  });

  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    searchTerm: '',
    status: 'all',
    client: '',
    dateRange: 'all'
  });

  const handleApplyFilters = () => {
    setActiveFilters(filters);
    onApplyFilters(filters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      searchTerm: '',
      status: 'all' as const,
      client: '',
      dateRange: 'all' as const
    };
    setFilters(clearedFilters);
    setActiveFilters(clearedFilters);
    onApplyFilters(clearedFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilters.searchTerm) count++;
    if (activeFilters.status !== 'all') count++;
    if (activeFilters.client) count++;
    if (activeFilters.dateRange !== 'all') count++;
    return count;
  };

  const statusLabels = {
    all: 'Todos',
    waiting: 'Em Espera',
    todo: 'A Fazer',
    progress: 'Andamento',
    done: 'Concluído'
  };

  const dateLabels = {
    all: 'Todas as datas',
    today: 'Hoje',
    week: 'Esta semana',
    month: 'Este mês'
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 relative">
            <Filter size={16} />
            Filtrar
            {getActiveFilterCount() > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                {getActiveFilterCount()}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <Input
                placeholder="Digite para buscar..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.status} onValueChange={(value: any) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="waiting">Em Espera</SelectItem>
                  <SelectItem value="todo">A Fazer</SelectItem>
                  <SelectItem value="progress">Andamento</SelectItem>
                  <SelectItem value="done">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Cliente</label>
              <Select value={filters.client} onValueChange={(value) => setFilters({ ...filters, client: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os clientes</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={filters.dateRange} onValueChange={(value: any) => setFilters({ ...filters, dateRange: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="ghost" onClick={handleClearFilters} className="flex-1">
                Limpar
              </Button>
              <Button onClick={handleApplyFilters} className="flex-1">
                Aplicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Filters Display */}
      {getActiveFilterCount() > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {activeFilters.searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Busca: {activeFilters.searchTerm}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs hover:bg-transparent"
                onClick={() => {
                  const newFilters = { ...activeFilters, searchTerm: '' };
                  setActiveFilters(newFilters);
                  onApplyFilters(newFilters);
                }}
              >
                <X size={12} />
              </Button>
            </Badge>
          )}
          {activeFilters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {statusLabels[activeFilters.status]}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs hover:bg-transparent"
                onClick={() => {
                  const newFilters = { ...activeFilters, status: 'all' as const };
                  setActiveFilters(newFilters);
                  onApplyFilters(newFilters);
                }}
              >
                <X size={12} />
              </Button>
            </Badge>
          )}
          {activeFilters.client && (
            <Badge variant="secondary" className="gap-1">
              Cliente: {activeFilters.client}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs hover:bg-transparent"
                onClick={() => {
                  const newFilters = { ...activeFilters, client: '' };
                  setActiveFilters(newFilters);
                  onApplyFilters(newFilters);
                }}
              >
                <X size={12} />
              </Button>
            </Badge>
          )}
          {activeFilters.dateRange !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {dateLabels[activeFilters.dateRange]}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs hover:bg-transparent"
                onClick={() => {
                  const newFilters = { ...activeFilters, dateRange: 'all' as const };
                  setActiveFilters(newFilters);
                  onApplyFilters(newFilters);
                }}
              >
                <X size={12} />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </>
  );
};

export default ProjectFilter;