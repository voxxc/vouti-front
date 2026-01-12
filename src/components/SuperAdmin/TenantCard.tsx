import { useState } from 'react';
import { Settings, ExternalLink, Users, Database, Trash2, AlertTriangle, Activity, FileText, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tenant } from '@/types/superadmin';
import { TenantStatsDialog } from './TenantStatsDialog';
import { TenantJuditLogsDialog } from './TenantJuditLogsDialog';
import { SuperAdminBoletosDialog } from './SuperAdminBoletosDialog';
import { TenantCredenciaisDialog } from './TenantCredenciaisDialog';
import { PlanoIndicator } from '@/components/Common/PlanoIndicator';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TenantCardProps {
  tenant: Tenant;
  systemColor: string | null;
  onEdit: () => void;
  onToggleStatus: (tenantId: string, isActive: boolean) => void;
  onDelete: (tenantId: string, tenantName: string) => void;
}

export function TenantCard({ tenant, systemColor, onEdit, onToggleStatus, onDelete }: TenantCardProps) {
  const [showStats, setShowStats] = useState(false);
  const [showJuditLogs, setShowJuditLogs] = useState(false);
  const [showBoletos, setShowBoletos] = useState(false);
  const [showCredenciais, setShowCredenciais] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenAuth = () => {
    window.open(`/${tenant.slug}/auth`, '_blank');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(tenant.id, tenant.name);
      setDeleteDialogOpen(false);
    } catch {
      // Dialog permanece aberto se der erro
    } finally {
      setIsDeleting(false);
    }
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
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
              {tenant.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
            <PlanoIndicator plano={tenant.plano || 'solo'} size="sm" />
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
            title="Ver estatisticas"
          >
            <Database className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowJuditLogs(true)}
            title="Chamadas Judit API"
          >
            <Activity className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowCredenciais(true)}
            title="Credenciais Judit"
          >
            <Key className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowBoletos(true)}
            title="Gerenciar boletos"
          >
            <FileText className="h-4 w-4" />
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
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Excluir cliente"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <AlertDialogTitle className="text-destructive">
                    Excluir Cliente Permanentemente
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription className="pt-2">
                  <span className="text-destructive font-semibold block mb-2">
                    ATENCAO: Esta acao e irreversivel!
                  </span>
                  Voce esta prestes a excluir <strong>{tenant.name}</strong>.
                  Todos os dados associados a este cliente serao perdidos permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  variant="destructive"
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir Permanentemente'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      <TenantStatsDialog
        tenant={tenant}
        open={showStats}
        onOpenChange={setShowStats}
      />

      <TenantJuditLogsDialog
        tenant={tenant}
        open={showJuditLogs}
        onOpenChange={setShowJuditLogs}
      />

      <SuperAdminBoletosDialog
        tenant={tenant}
        open={showBoletos}
        onOpenChange={setShowBoletos}
      />

      <TenantCredenciaisDialog
        open={showCredenciais}
        onOpenChange={setShowCredenciais}
        tenantId={tenant.id}
        tenantName={tenant.name}
      />
    </>
  );
}
