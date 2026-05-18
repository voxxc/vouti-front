import { useMemo, useState } from 'react';
import { Search, Rows3, AlignJustify, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Tenant } from '@/types/superadmin';
import { TenantRow } from './TenantRow';
import { TenantRowMobile } from './TenantRowMobile';
import { cn } from '@/lib/utils';

interface Props {
  tenants: Tenant[];
  systemColor: string | null;
  onEditTenant: (tenant: Tenant) => void;
  onToggleStatus: (tenantId: string, isActive: boolean) => void;
  onDeleteTenant: (tenantId: string, tenantName: string) => void;
  pagamentosPorTenant?: Record<string, number>;
  incompleteProcessosPorTenant?: Record<string, number>;
  onIncompleteRefresh?: () => void;
}

type Density = 'dense' | 'comfortable';
type StatusFilter = 'all' | 'active' | 'inactive';
type PendFilter = 'all' | 'with';

export function TenantsTable({
  tenants, systemColor, onEditTenant, onToggleStatus, onDeleteTenant,
  pagamentosPorTenant = {}, incompleteProcessosPorTenant = {}, onIncompleteRefresh,
}: Props) {
  const [search, setSearch] = useState('');
  const [planoFilter, setPlanoFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pendFilter, setPendFilter] = useState<PendFilter>('all');
  const [density, setDensity] = useState<Density>('comfortable');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const planos = useMemo(
    () => Array.from(new Set(tenants.map((t) => t.plano).filter(Boolean))).sort(),
    [tenants],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => {
      if (statusFilter === 'active' && !t.is_active) return false;
      if (statusFilter === 'inactive' && t.is_active) return false;
      if (planoFilter !== 'all' && t.plano !== planoFilter) return false;
      const pend = (pagamentosPorTenant[t.id] || 0) + (incompleteProcessosPorTenant[t.id] || 0);
      if (pendFilter === 'with' && pend === 0) return false;
      if (q) {
        const hay = `${t.name} ${t.slug} ${t.email_domain || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tenants, search, planoFilter, statusFilter, pendFilter, pagamentosPorTenant, incompleteProcessosPorTenant]);

  const activeCount = tenants.filter((t) => t.is_active).length;

  const activeFiltersCount =
    (planoFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (pendFilter !== 'all' ? 1 : 0);

  const filterControls = (
    <>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Plano</label>
        <Select value={planoFilter} onValueChange={setPlanoFilter}>
          <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Plano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            {planos.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Pendências</label>
        <Select value={pendFilter} onValueChange={(v) => setPendFilter(v as PendFilter)}>
          <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="with">Só com pendência</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <div className="space-y-3">
      {/* MOBILE toolbar */}
      <div className="md:hidden space-y-2">
        <div className="text-xs text-muted-foreground">
          {activeCount} ativos / {tenants.length} total
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-8"
            />
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 gap-1.5 relative">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">{activeFiltersCount}</Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {filterControls}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Densidade</label>
                  <div className="flex items-center rounded-md border border-border w-fit">
                    <Button
                      variant={density === 'comfortable' ? 'secondary' : 'ghost'}
                      size="sm" className="h-9 rounded-r-none"
                      onClick={() => setDensity('comfortable')}
                    >
                      <Rows3 className="h-4 w-4 mr-1" /> Confortável
                    </Button>
                    <Button
                      variant={density === 'dense' ? 'secondary' : 'ghost'}
                      size="sm" className="h-9 rounded-l-none"
                      onClick={() => setDensity('dense')}
                    >
                      <AlignJustify className="h-4 w-4 mr-1" /> Densa
                    </Button>
                  </div>
                </div>
                <Button className="w-full h-10" onClick={() => setFiltersOpen(false)}>Aplicar</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* DESKTOP toolbar */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        <div className="text-xs text-muted-foreground mr-2">
          {activeCount} ativos / {tenants.length} total
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, slug, domínio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8"
          />
        </div>
        <Select value={planoFilter} onValueChange={setPlanoFilter}>
          <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Plano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            {planos.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pendFilter} onValueChange={(v) => setPendFilter(v as PendFilter)}>
          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as pendências</SelectItem>
            <SelectItem value="with">Só com pendência</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center rounded-md border border-border ml-auto">
          <Button
            variant={density === 'comfortable' ? 'secondary' : 'ghost'}
            size="sm" className="h-8 rounded-r-none"
            onClick={() => setDensity('comfortable')}
            title="Confortável"
          >
            <Rows3 className="h-4 w-4" />
          </Button>
          <Button
            variant={density === 'dense' ? 'secondary' : 'ghost'}
            size="sm" className="h-8 rounded-l-none"
            onClick={() => setDensity('dense')}
            title="Densa"
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* DESKTOP table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className={cn('bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground')}>
            <tr>
              <th className="w-8" />
              <th className="text-left font-medium px-3 py-2">Cliente</th>
              <th className="text-left font-medium px-3 py-2 w-32">Plano</th>
              <th className="text-left font-medium px-3 py-2 w-20">Ativo</th>
              <th className="text-center font-medium px-3 py-2 w-24">Pend.</th>
              <th className="text-center font-medium px-3 py-2 w-24">Vouti.CRM</th>
              <th className="text-right font-medium px-3 py-2 w-28">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <TenantRow
                  key={t.id}
                  tenant={t}
                  systemColor={systemColor}
                  isExpanded={expandedId === t.id}
                  onToggleExpand={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  onEdit={() => onEditTenant(t)}
                  onToggleStatus={onToggleStatus}
                  onDelete={onDeleteTenant}
                  pendingPayments={pagamentosPorTenant[t.id] || 0}
                  incompleteProcessosCount={incompleteProcessosPorTenant[t.id] || 0}
                  onIncompleteRefresh={onIncompleteRefresh}
                  density={density}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE list */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhum cliente encontrado.
          </div>
        ) : (
          filtered.map((t) => (
            <TenantRowMobile
              key={t.id}
              tenant={t}
              systemColor={systemColor}
              isExpanded={expandedId === t.id}
              onToggleExpand={() => setExpandedId(expandedId === t.id ? null : t.id)}
              onEdit={() => onEditTenant(t)}
              onToggleStatus={onToggleStatus}
              onDelete={onDeleteTenant}
              pendingPayments={pagamentosPorTenant[t.id] || 0}
              incompleteProcessosCount={incompleteProcessosPorTenant[t.id] || 0}
              onIncompleteRefresh={onIncompleteRefresh}
            />
          ))
        )}
      </div>
    </div>
  );
}
