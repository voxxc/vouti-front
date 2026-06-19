import { useState } from 'react';
import {
  Settings, ExternalLink, Trash2, AlertTriangle, Activity, CreditCard, Key, Hash,
  ChevronRight, ChevronDown, UserPlus, FileStack, Loader2, FileWarning, Clock,
  MoreHorizontal, Database, IdCard, ShieldAlert, FolderArchive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tenant } from '@/types/superadmin';
import { TenantStatsDialog } from './TenantStatsDialog';
import { TenantJuditLogsDialog } from './TenantJuditLogsDialog';
import { SuperAdminBoletosDialog } from './SuperAdminBoletosDialog';
import { TenantCredenciaisDialog } from './TenantCredenciaisDialog';
import { CartaoCredencialDialog } from './CartaoCredencialDialog';
import { TenantBancoIdsDialog } from './TenantBancoIdsDialog';
import { CreateTenantAdminDialog } from './CreateTenantAdminDialog';
import { TenantPushDocsDialog } from './TenantPushDocsDialog';
import { TenantProcessosIncompletosDialog } from './TenantProcessosIncompletosDialog';
import { TenantProcessosParadosDialog } from './TenantProcessosParadosDialog';
import { TenantProcessosSigilososDialog } from './TenantProcessosSigilososDialog';
import { TenantReuniaoArquivosDialog } from './TenantReuniaoArquivosDialog';
import { PlanoIndicator } from '@/components/Common/PlanoIndicator';
import CloudIcon from '@/components/CloudIcon';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ActionGroup, PillButton } from './TenantActionPill';

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
}

export function TenantRowMobile({
  tenant, systemColor, isExpanded, onToggleExpand, onEdit, onToggleStatus, onDelete,
  pendingPayments = 0, incompleteProcessosCount = 0, onSettingsChange, onIncompleteRefresh,
}: Props) {
  const [showStats, setShowStats] = useState(false);
  const [showJuditLogs, setShowJuditLogs] = useState(false);
  const [showBoletos, setShowBoletos] = useState(false);
  const [showCredenciais, setShowCredenciais] = useState(false);
  const [showCartao, setShowCartao] = useState(false);
  const [showBancoIds, setShowBancoIds] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showPushDocs, setShowPushDocs] = useState(false);
  const [showProcessosIncompletos, setShowProcessosIncompletos] = useState(false);
  const [showParados, setShowParados] = useState(false);
  const [showSigilosos, setShowSigilosos] = useState(false);
  const [showReuniaoArquivos, setShowReuniaoArquivos] = useState(false);
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

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Header */}
        <button
          onClick={onToggleExpand}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full shrink-0',
              tenant.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40',
            )}
          />
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="w-9 h-9 rounded-md object-cover shrink-0" />
          ) : (
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center text-sm font-bold shrink-0"
              style={{ backgroundColor: `${systemColor}20`, color: systemColor || undefined }}
            >
              {tenant.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground truncate">{tenant.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {tenant.slug}{tenant.email_domain ? ` · ${tenant.email_domain}` : ''}
            </div>
          </div>
          {isExpanded
            ? <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />}
        </button>

        {/* Meta line */}
        <div className="px-3 pb-3 flex flex-wrap items-center gap-2">
          <PlanoIndicator plano={tenant.plano || 'solo'} size="sm" />
          <div className="flex items-center gap-1.5 text-xs">
            <Switch
              checked={tenant.is_active}
              onCheckedChange={(checked) => onToggleStatus(tenant.id, checked)}
            />
            <span className="text-muted-foreground">{tenant.is_active ? 'Ativo' : 'Inativo'}</span>
          </div>
          {pendTotal > 0 && (
            <Badge variant="destructive" className="cursor-pointer" onClick={() => setShowBoletos(true)}>
              {pendTotal} pendência{pendTotal > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Action bar */}
        <div className="grid grid-cols-3 border-t border-border">
          <Button
            variant="ghost"
            className="h-11 rounded-none gap-1.5 text-xs"
            onClick={handleOpenTenant}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir
          </Button>
          <Button
            variant="ghost"
            className={cn(
              'h-11 rounded-none gap-1.5 text-xs border-x border-border',
              isWhatsAppEnabled ? 'text-emerald-500' : 'text-muted-foreground',
            )}
            onClick={handleToggleWhatsApp}
            disabled={whatsAppLoading}
          >
            {whatsAppLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudIcon className="h-4 w-4" />}
            CRM
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-11 rounded-none gap-1.5 text-xs">
                <MoreHorizontal className="h-4 w-4" />
                Mais
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

        {/* Expanded */}
        {isExpanded && (
          <div className="border-t border-border bg-muted/20 p-3 flex flex-col gap-4">
            <ActionGroup label="Auditoria" variant="stacked">
              <PillButton fullWidth icon={Database} onClick={() => setShowStats(true)}>Estatísticas</PillButton>
              <PillButton fullWidth icon={Clock} onClick={() => setShowParados(true)}>Parados</PillButton>
              <PillButton fullWidth icon={FileWarning} onClick={() => setShowProcessosIncompletos(true)} badge={incompleteProcessosCount}>Incompletos</PillButton>
              <PillButton fullWidth icon={FileStack} onClick={() => setShowPushDocs(true)}>Push-Docs</PillButton>
              <PillButton fullWidth icon={Hash} onClick={() => setShowBancoIds(true)}>Banco de IDs</PillButton>
              <PillButton fullWidth icon={ShieldAlert} onClick={() => setShowSigilosos(true)}>Sigilosos</PillButton>
              <PillButton fullWidth icon={FolderArchive} onClick={() => setShowReuniaoArquivos(true)}>Docs reuniões</PillButton>
            </ActionGroup>

            <ActionGroup label="Integrações" variant="stacked">
              <PillButton fullWidth icon={Key} onClick={() => setShowCredenciais(true)}>Credenciais Judit</PillButton>
              <PillButton fullWidth icon={IdCard} onClick={() => setShowCartao(true)}>Cartão Credencial</PillButton>
              <PillButton fullWidth icon={Activity} onClick={() => setShowJuditLogs(true)}>Chamadas Judit</PillButton>
              <PillButton fullWidth icon={CreditCard} onClick={() => setShowBoletos(true)} badge={pendingPayments}>Pagamentos</PillButton>
            </ActionGroup>

            <ActionGroup label="Acesso" variant="stacked">
              <PillButton fullWidth icon={Settings} onClick={onEdit}>Editar dados</PillButton>
              <PillButton fullWidth icon={UserPlus} onClick={() => setShowCreateAdmin(true)}>Criar admin</PillButton>
              <PillButton fullWidth icon={ExternalLink} onClick={handleOpenTenant}>Abrir tenant</PillButton>
              <PillButton fullWidth icon={Trash2} destructive onClick={() => setDeleteDialogOpen(true)}>Excluir</PillButton>
            </ActionGroup>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <AlertDialogTitle className="text-destructive">Excluir Cliente Permanentemente</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              <span className="text-destructive font-semibold block mb-2">ATENCAO: Esta acao e irreversivel!</span>
              Voce esta prestes a excluir <strong>{tenant.name}</strong>.
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

      <TenantStatsDialog tenant={tenant} open={showStats} onOpenChange={setShowStats} />
      <TenantJuditLogsDialog tenant={tenant} open={showJuditLogs} onOpenChange={setShowJuditLogs} />
      <SuperAdminBoletosDialog tenant={tenant} open={showBoletos} onOpenChange={setShowBoletos} />
      <TenantCredenciaisDialog open={showCredenciais} onOpenChange={setShowCredenciais} tenantId={tenant.id} tenantName={tenant.name} />
      <CartaoCredencialDialog open={showCartao} onOpenChange={setShowCartao} tenantId={tenant.id} tenantName={tenant.name} />
      <TenantBancoIdsDialog open={showBancoIds} onOpenChange={setShowBancoIds} tenantId={tenant.id} tenantName={tenant.name} />
      <CreateTenantAdminDialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin} tenant={tenant} />
      <TenantPushDocsDialog open={showPushDocs} onOpenChange={setShowPushDocs} tenant={tenant} />
      <TenantProcessosIncompletosDialog open={showProcessosIncompletos} onOpenChange={setShowProcessosIncompletos} tenant={tenant} onComplete={onIncompleteRefresh} />
      <TenantProcessosParadosDialog open={showParados} onOpenChange={setShowParados} tenant={tenant} />
      <TenantProcessosSigilososDialog open={showSigilosos} onOpenChange={setShowSigilosos} tenant={tenant} />
      <TenantReuniaoArquivosDialog open={showReuniaoArquivos} onOpenChange={setShowReuniaoArquivos} tenant={tenant} />
    </>
  );
}
