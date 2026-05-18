import { Scale, Factory, Link, Plus, Bell, MessageSquare, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SystemType, Tenant } from '@/types/superadmin';
import { TenantsTable } from './TenantsTable';

const iconMap: Record<string, LucideIcon> = {
  Scale,
  Factory,
  Link,
  MessageSquare,
};

// ID do sistema "Gestão Jurídica"
const GESTAO_JURIDICA_ID = 'e571a35b-1b38-4b8a-bea2-e7bdbe2cdf82';

interface SystemTypeSectionProps {
  systemType: SystemType;
  tenants: Tenant[];
  onCreateTenant: (systemTypeId: string) => void;
  onEditTenant: (tenant: Tenant) => void;
  onToggleStatus: (tenantId: string, isActive: boolean) => void;
  onDeleteTenant: (tenantId: string, tenantName: string) => void;
  onOpenAvisos?: (systemTypeId: string, systemTypeName: string) => void;
  pagamentosPorTenant?: Record<string, number>;
  incompleteProcessosPorTenant?: Record<string, number>;
  onIncompleteRefresh?: () => void;
}

export function SystemTypeSection({
  systemType,
  tenants,
  onCreateTenant,
  onEditTenant,
  onToggleStatus,
  onDeleteTenant,
  onOpenAvisos,
  pagamentosPorTenant = {},
  incompleteProcessosPorTenant = {},
  onIncompleteRefresh,
}: SystemTypeSectionProps) {
  const isGestaoJuridica = systemType.id === GESTAO_JURIDICA_ID;
  const Icon = systemType.icon ? iconMap[systemType.icon] || Scale : Scale;

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${systemType.color}20` }}
          >
            <Icon className="h-6 w-6" style={{ color: systemType.color || undefined }} />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-xl truncate">{systemType.name}</CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2">{systemType.description}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          {isGestaoJuridica && onOpenAvisos && (
            <Button
              onClick={() => onOpenAvisos(systemType.id, systemType.name)}
              variant="outline"
              size="sm"
              className="gap-2 h-10 sm:h-9 w-full sm:w-auto"
            >
              <Bell className="h-4 w-4" />
              Avisos
            </Button>
          )}
          <Button
            onClick={() => onCreateTenant(systemType.id)}
            variant="outline"
            size="sm"
            className="gap-2 h-10 sm:h-9 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span className="sm:hidden">Novo cliente</span>
            <span className="hidden sm:inline">Criar Novo Cliente</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tenants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum cliente cadastrado neste sistema.
          </div>
        ) : (
          <TenantsTable
            tenants={tenants}
            systemColor={systemType.color}
            onEditTenant={onEditTenant}
            onToggleStatus={onToggleStatus}
            onDeleteTenant={onDeleteTenant}
            pagamentosPorTenant={pagamentosPorTenant}
            incompleteProcessosPorTenant={incompleteProcessosPorTenant}
            onIncompleteRefresh={onIncompleteRefresh}
          />
        )}
      </CardContent>
    </Card>
  );
}
