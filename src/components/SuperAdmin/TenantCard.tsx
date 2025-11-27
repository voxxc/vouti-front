import { useState } from 'react';
import { Settings, ExternalLink, Users, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tenant } from '@/types/superadmin';
import { TenantStatsDialog } from './TenantStatsDialog';

interface TenantCardProps {
  tenant: Tenant;
  systemColor: string | null;
  onEdit: () => void;
  onToggleStatus: (tenantId: string, isActive: boolean) => void;
}

export function TenantCard({ tenant, systemColor, onEdit, onToggleStatus }: TenantCardProps) {
  const [showStats, setShowStats] = useState(false);

  const handleOpenAuth = () => {
    window.open(`/${tenant.slug}/auth`, '_blank');
  };

  return (
    <>
      <Card className="p-4 bg-card border-border hover:border-primary/30 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: `${systemColor}20`, color: systemColor || undefined }}
              >
                {tenant.name.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-foreground">{tenant.name}</h3>
              <p className="text-xs text-muted-foreground">{tenant.slug}</p>
            </div>
          </div>
          <Switch
            checked={tenant.is_active}
            onCheckedChange={(checked) => onToggleStatus(tenant.id, checked)}
          />
        </div>

        <div className="space-y-2 mb-4">
          {tenant.email_domain && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{tenant.email_domain}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
              {tenant.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={onEdit}>
            <Settings className="h-4 w-4" />
            Configurar
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowStats(true)}
            title="Ver estatísticas"
          >
            <Database className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={handleOpenAuth}
            title={`Abrir /${tenant.slug}/auth`}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <TenantStatsDialog
        tenant={tenant}
        open={showStats}
        onOpenChange={setShowStats}
      />
    </>
  );
}
