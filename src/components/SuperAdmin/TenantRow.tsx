import { useState } from 'react';
import {
  Settings, ExternalLink, Users, Database, Trash2, AlertTriangle, Activity,
  CreditCard, Key, Hash, ChevronRight, ChevronDown, UserPlus, FileStack,
  Loader2, FileWarning, Clock, MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { TenantProcessosIncompletosDialog } from './TenantProcessosIncompletosDialog';
import { TenantProcessosParadosDialog } from './TenantProcessosParadosDialog';
import { PlanoIndicator } from '@/components/Common/PlanoIndicator';
import CloudIcon from '@/components/CloudIcon';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ActionGroup, PillButton } from './TenantActionPill';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  tenant: Tenant;
  systemColor: string | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleStatus: (tenantId: string, isActive: boolean) => void;
  onDelete: (tenantId: string, tenantName: string) => void;
  pendingPayments?: number;
  incompleteProcessosCount?: number;
  onSettingsChange?: (tenantId: string, settings: unknown) => void;
  onIncompleteRefresh?: () => void;
  density: 'dense' | 'comfortable';
}

export function TenantRow({
  tenant, systemColor, isExpanded, onToggleExpand, onEdit, onToggleStatus, onDelete,
  pendingPayments = 0, incompleteProcessosCount = 0, onSettingsChange, onIncompleteRefresh,
  density,
}: Props) {
  const [showStats, setShowStats] = useState(false);
  const [showJuditLogs, setShowJuditLogs] = useState(false);
  const [showBoletos, setShowBoletos] = useState(false);
  const [showCredenciais, setShowCredenciais] = useState(false);
  const [showBancoIds, setShowBancoIds] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showPushDocs, setShowPushDocs] = useState(false);
  const [showProcessosIncompletos, setShowProcessosIncompletos] = useState(false);
  const [showParados, setShowParados] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [whatsAppLoading, setWhatsAppLoading] = useState(false);

  const isWhatsAppEnabled = (tenant.settings as Record<string, unknown>)?.whatsapp_enabled === true;
  const pendTotal = pendingPayments + incompleteProcessosCount;

  const handleOpenTenant = () => window.open(`/${tenant.slug}/dashboard`, '_blank');

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(tenant.id, tenant.name);
      setDeleteDialogOpen(false);
    } catch {/* keep open */} finally {
      setIsDeleting(false);
    }
  };

  const handleToggleWhatsApp = async () => {
    setWhatsAppLoading(true);
    try {
      const currentSettings = (tenant.settings as Record<string, unknown>) || {};
      const newSettings = { ...currentSettings, whatsapp_enabled: !isWhatsAppEnabled };
      const { error } = await supabase
        .from('tenants')
        .update({ settings: newSettings as unknown as Record<string, never> })
        .eq('id', tenant.id);
      if (error) throw error;
      toast.success(isWhatsAppEnabled ? 'Vouti.CRM desativado' : 'Vouti.CRM ativado');
      onSettingsChange?.(tenant.id, newSettings);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao alterar configuração');
    } finally {
      setWhatsAppLoading(false);
    }
  };

  const rowPad = density === 'dense' ? 'py-2' : 'py-3';

  return (
    <>
      <tr
        className={cn(
          'border-b border-border/60 hover:bg-muted/30 transition-colors',
          isExpanded && 'bg-muted/40',
        )}
      >
        {/* Chevron */}
        <td className={cn('pl-3 pr-1', rowPad)}>
          <button
            onClick={onToggleExpand}
            className="text-muted-foreground hover:text-foreground"
            aria-label={isExpanded ? 'Recolher' : 'Expandir'}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>

        {/* Cliente */}
        <td className={cn('pr-3', rowPad)}>
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={cn(
                'h-2 w-2 rounded-full shrink-0',
                tenant.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40',
              )}
              title={tenant.is_active ? 'Ativo' : 'Inativo'}
            />
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.name} className="w-7 h-7 rounded-md object-cover shrink-0" />
            ) : (
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: `${systemColor}20`, color: systemColor || undefined }}
              >
                {tenant.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{tenant.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {tenant.slug}{tenant.email_domain ? ` · ${tenant.email_domain}` : ''}
              </div>
            </div>
          </div>
        </td>

        {/* Plano */}
        <td className={cn('px-3', rowPad)}>
          <PlanoIndicator plano={tenant.plano || 'solo'} size="sm" />
        </td>

        {/* Status switch */}
        <td className={cn('px-3', rowPad)}>
          <Switch
            checked={tenant.is_active}
            onCheckedChange={(checked) => onToggleStatus(tenant.id, checked)}
          />
        </td>

        {/* Pendências */}
        <td className={cn('px-3 text-center', rowPad)}>
          {pendTotal > 0 ? (
            <Badge variant="destructive" className="cursor-pointer" onClick={() => setShowBoletos(true)}>
              {pendTotal}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>

        {/* Vouti.CRM */}
        <td className={cn('px-3 text-center', rowPad)}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              isWhatsAppEnabled ? 'text-emerald-500 hover:text-emerald-600' : 'text-muted-foreground',
            )}
            onClick={handleToggleWhatsApp}
            disabled={whatsAppLoading}
            title={isWhatsAppEnabled ? 'Vouti.CRM ativado' : 'Vouti.CRM desativado'}
          >
            {whatsAppLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudIcon className="h-4 w-4" />}
          </Button>
        </td>

        {/* Ações */}
        <td className={cn('pl-3 pr-3', rowPad)}>
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenTenant} title="Abrir tenant">
              <ExternalLink className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Mais ações">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onEdit}>
                  <Settings className="h-4 w-4 mr-2" /> Editar dados
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCreateAdmin(true)}>
                  <UserPlus className="h-4 w-4 mr-2" /> Criar admin extra
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir cliente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>

      {/* Expanded panel */}
      {isExpanded && (
        <tr className="bg-muted/20 border-b border-border/60">
          <td />
          <td colSpan={6} className="px-3 py-3">
            <div className="flex flex-col gap-2.5">
              <ActionGroup label="Auditoria">
                <PillButton icon={Database} onClick={() => setShowStats(true)}>Estatísticas</PillButton>
                <PillButton icon={Clock} onClick={() => setShowParados(true)}>Processos parados</PillButton>
                <PillButton
                  icon={FileWarning}
                  onClick={() => setShowProcessosIncompletos(true)}
                  badge={incompleteProcessosCount}
                >Processos incompletos</PillButton>
                <PillButton icon={FileStack} onClick={() => setShowPushDocs(true)}>Push-Docs</PillButton>
                <PillButton icon={Hash} onClick={() => setShowBancoIds(true)}>Banco de IDs</PillButton>
              </ActionGroup>

              <ActionGroup label="Integrações">
                <PillButton icon={Key} onClick={() => setShowCredenciais(true)}>Credenciais Judit</PillButton>
                <PillButton icon={Activity} onClick={() => setShowJuditLogs(true)}>Chamadas Judit</PillButton>
                <PillButton
                  icon={CreditCard}
                  onClick={() => setShowBoletos(true)}
                  badge={pendingPayments}
                >Pagamentos</PillButton>
              </ActionGroup>

              <ActionGroup label="Acesso">
                <PillButton icon={Settings} onClick={onEdit}>Editar dados</PillButton>
                <PillButton icon={UserPlus} onClick={() => setShowCreateAdmin(true)}>Criar admin extra</PillButton>
                <PillButton icon={ExternalLink} onClick={handleOpenTenant}>Abrir tenant</PillButton>
                <PillButton
                  icon={Trash2}
                  onClick={() => setDeleteDialogOpen(true)}
                  destructive
                >Excluir cliente</PillButton>
              </ActionGroup>
            </div>
          </td>
        </tr>
      )}

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
            <Button onClick={handleDelete} disabled={isDeleting} variant="destructive">
              {isDeleting ? 'Excluindo...' : 'Excluir Permanentemente'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogs */}
      <TenantStatsDialog tenant={tenant} open={showStats} onOpenChange={setShowStats} />
      <TenantJuditLogsDialog tenant={tenant} open={showJuditLogs} onOpenChange={setShowJuditLogs} />
      <SuperAdminBoletosDialog tenant={tenant} open={showBoletos} onOpenChange={setShowBoletos} />
      <TenantCredenciaisDialog open={showCredenciais} onOpenChange={setShowCredenciais} tenantId={tenant.id} tenantName={tenant.name} />
      <TenantBancoIdsDialog open={showBancoIds} onOpenChange={setShowBancoIds} tenantId={tenant.id} tenantName={tenant.name} />
      <CreateTenantAdminDialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin} tenant={tenant} />
      <TenantPushDocsDialog open={showPushDocs} onOpenChange={setShowPushDocs} tenant={tenant} />
      <TenantProcessosIncompletosDialog
        open={showProcessosIncompletos}
        onOpenChange={setShowProcessosIncompletos}
        tenant={tenant}
        onComplete={onIncompleteRefresh}
      />
      <TenantProcessosParadosDialog open={showParados} onOpenChange={setShowParados} tenant={tenant} />
    </>
  );
}

