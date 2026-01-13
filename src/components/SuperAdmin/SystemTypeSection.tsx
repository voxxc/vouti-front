import { Scale, Factory, Link, Plus, Bell, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SystemType, Tenant } from '@/types/superadmin';
import { TenantCard } from './TenantCard';

const iconMap: Record<string, LucideIcon> = {
  Scale,
  Factory,
  Link,
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
}

export function SystemTypeSection({
  systemType,
  tenants,
  onCreateTenant,
  onEditTenant,
  onToggleStatus,
  onDeleteTenant,
  onOpenAvisos,
}: SystemTypeSectionProps) {
  const isGestaoJuridica = systemType.id === GESTAO_JURIDICA_ID;
  const Icon = systemType.icon ? iconMap[systemType.icon] || Scale : Scale;

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${systemType.color}20` }}
          >
            <Icon className="h-6 w-6" style={{ color: systemType.color || undefined }} />
          </div>
          <div>
            <CardTitle className="text-xl">{systemType.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{systemType.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isGestaoJuridica && onOpenAvisos && (
            <Button
              onClick={() => onOpenAvisos(systemType.id, systemType.name)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Avisos
            </Button>
          )}
          <Button
            onClick={() => onCreateTenant(systemType.id)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Criar Novo Cliente
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tenants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum cliente cadastrado neste sistema.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                systemColor={systemType.color}
                onEdit={() => onEditTenant(tenant)}
                onToggleStatus={onToggleStatus}
                onDelete={onDeleteTenant}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
