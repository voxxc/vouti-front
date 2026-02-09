import { useState } from 'react';
import { Settings, ExternalLink, Users, Database, Trash2, AlertTriangle, Activity, CreditCard, Key, Hash, ChevronDown, UserPlus, FileStack, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tenant } from '@/types/superadmin';
import { TenantStatsDialog } from './TenantStatsDialog';
import { TenantJuditLogsDialog } from './TenantJuditLogsDialog';
import { SuperAdminBoletosDialog } from './SuperAdminBoletosDialog';
import { TenantCredenciaisDialog } from './TenantCredenciaisDialog';
import { TenantBancoIdsDialog } from './TenantBancoIdsDialog';
import { CreateTenantAdminDialog } from './CreateTenantAdminDialog';
import { TenantPushDocsDialog } from './TenantPushDocsDialog';
import { PlanoIndicator } from '@/components/Common/PlanoIndicator';
import CloudIcon from '@/components/CloudIcon';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
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
  pendingPayments?: number;
  onSettingsChange?: (tenantId: string, settings: unknown) => void;
}

export function TenantCard({ tenant, systemColor, onEdit, onToggleStatus, onDelete, pendingPayments = 0, onSettingsChange }: TenantCardProps) {
  const [showStats, setShowStats] = useState(false);
  const [showJuditLogs, setShowJuditLogs] = useState(false);
  const [showBoletos, setShowBoletos] = useState(false);
  const [showCredenciais, setShowCredenciais] = useState(false);
  const [showBancoIds, setShowBancoIds] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showPushDocs, setShowPushDocs] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [whatsAppLoading, setWhatsAppLoading] = useState(false);

  // Extrair status do Vouti.Bot das settings
  const isWhatsAppEnabled = (tenant.settings as Record<string, unknown>)?.whatsapp_enabled === true;

  const handleOpenTenant = () => {
    window.open(`/${tenant.slug}/dashboard`, '_blank');
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

  const handleToggleWhatsApp = async () => {
    setWhatsAppLoading(true);
    try {
      const currentSettings = (tenant.settings as Record<string, unknown>) || {};
      const newSettings = {
        ...currentSettings,
        whatsapp_enabled: !isWhatsAppEnabled
      };

      const { error } = await supabase
        .from('tenants')
        .update({ settings: newSettings as unknown as Record<string, never> })
        .eq('id', tenant.id);

      if (error) throw error;

      toast.success(
        isWhatsAppEnabled 
          ? 'Vouti.Bot desativado para este cliente' 
          : 'Vouti.Bot ativado para este cliente'
      );

      // Notificar componente pai sobre a mudança
      onSettingsChange?.(tenant.id, newSettings);
    } catch (error) {
      console.error('Erro ao alterar status do Vouti.Bot:', error);
      toast.error('Erro ao alterar configuração');
    } finally {
      setWhatsAppLoading(false);
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

        <div className="pt-3 border-t border-border space-y-2">
          {/* Linha 1: Ações principais */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Configurar
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={onEdit}>
                  <Settings className="h-4 w-4 mr-2" />
                  Editar Dados
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCreateAdmin(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Admin Extra
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex-1" />
            <Button 
              variant="ghost" 
              size="sm"
              className="gap-2"
              onClick={handleOpenTenant}
              title={`Acessar ${tenant.name}`}
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
          
          {/* Linha 2: Ferramentas */}
          <div className="flex items-center gap-1 flex-wrap">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowStats(true)}
              title="Ver estatisticas"
            >
              <Database className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowJuditLogs(true)}
              title="Chamadas Judit API"
            >
              <Activity className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowCredenciais(true)}
              title="Credenciais Judit"
            >
              <Key className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowPushDocs(true)}
              title="Push-Docs (Monitoramento)"
            >
              <FileStack className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowBancoIds(true)}
              title="Banco de IDs"
            >
              <Hash className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 relative"
              onClick={() => setShowBoletos(true)}
              title="Gerenciar pagamentos"
            >
              <CreditCard className="h-4 w-4" />
              {pendingPayments > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 min-w-4 p-0 flex items-center justify-center text-[10px]"
                >
                  {pendingPayments}
                </Badge>
              )}
            </Button>
            
            {/* Botão Vouti.Bot Toggle */}
            <Button 
              variant="ghost" 
              size="icon"
              className={cn(
                "h-8 w-8 transition-colors",
                isWhatsAppEnabled 
                  ? "text-green-500 hover:text-green-600 hover:bg-green-500/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={handleToggleWhatsApp}
              disabled={whatsAppLoading}
              title={isWhatsAppEnabled ? "Vouti.Bot: Ativado" : "Vouti.Bot: Desativado"}
            >
              {whatsAppLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudIcon className="h-5 w-5" />
              )}
            </Button>
          </div>
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

      <TenantBancoIdsDialog
        open={showBancoIds}
        onOpenChange={setShowBancoIds}
        tenantId={tenant.id}
        tenantName={tenant.name}
      />

      <CreateTenantAdminDialog
        open={showCreateAdmin}
        onOpenChange={setShowCreateAdmin}
        tenant={tenant}
      />

      <TenantPushDocsDialog
        open={showPushDocs}
        onOpenChange={setShowPushDocs}
        tenant={tenant}
      />
    </>
  );
}
