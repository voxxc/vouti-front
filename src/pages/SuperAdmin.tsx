import { useState } from 'react';
import { Shield, Loader2, Eye, EyeOff, LogOut, Users, Headphones, Building2, KeyRound, Search, BookOpen, Activity, Stethoscope, FlaskConical, QrCode, CreditCard, ShieldCheck, Webhook } from 'lucide-react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAllCredenciaisPendentes } from '@/hooks/useAllCredenciaisPendentes';
import { useAllPaymentConfirmations } from '@/hooks/useAllPaymentConfirmations';
import { SystemTypeSection } from '@/components/SuperAdmin/SystemTypeSection';
import { CreateTenantDialog } from '@/components/SuperAdmin/CreateTenantDialog';
import { CreateCrmTenantDialog } from '@/components/SuperAdmin/CreateCrmTenantDialog';
import { EditTenantDialog } from '@/components/SuperAdmin/EditTenantDialog';
import { SuperAdminThemeToggle } from '@/components/SuperAdmin/SuperAdminThemeToggle';
import { SuperAdminLeads } from '@/components/SuperAdmin/SuperAdminLeads';
import { SuperAdminSupport } from '@/components/SuperAdmin/SuperAdminSupport';
import { SuperAdminAvisosDialog } from '@/components/SuperAdmin/SuperAdminAvisosDialog';
import { CredenciaisCentralDialog } from '@/components/SuperAdmin/CredenciaisCentralDialog';
import { SuperAdminBuscaGeral } from '@/components/SuperAdmin/SuperAdminBuscaGeral';
import { SuperAdminJuditDocs } from '@/components/SuperAdmin/SuperAdminJuditDocs';
import { SuperAdminMonitoramento } from '@/components/SuperAdmin/SuperAdminMonitoramento';
import { SuperAdminDiagnosticoJudit } from '@/components/SuperAdmin/SuperAdminDiagnosticoJudit';
import { SuperAdminImportCNJTest } from '@/components/SuperAdmin/SuperAdminImportCNJTest';
import { SuperAdminPixConfig } from '@/components/SuperAdmin/SuperAdminPixConfig';
import { SuperAdminAuthenticator } from '@/components/SuperAdmin/SuperAdminAuthenticator';
import { SuperAdminWebhookTest } from '@/components/SuperAdmin/SuperAdminWebhookTest';
import { SystemType, Tenant, TenantFormData } from '@/types/superadmin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

export default function SuperAdmin() {
  const {
    systemTypes,
    loading,
    isSuperAdmin,
    currentUserEmail,
    session,
    createTenant,
    updateTenant,
    deleteTenant,
    toggleTenantStatus,
    getTenantsBySystemType,
    signInSuperAdmin,
    signOutSuperAdmin,
  } = useSuperAdmin();

  const { totalPendentes } = useAllCredenciaisPendentes();
  const { totalPendentes: totalPagamentosPendentes, porTenant: pagamentosPorTenant } = useAllPaymentConfirmations();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [avisosDialogOpen, setAvisosDialogOpen] = useState(false);
  const [credenciaisDialogOpen, setCredenciaisDialogOpen] = useState(false);
  const [selectedSystemType, setSelectedSystemType] = useState<SystemType | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedAvisosSystemType, setSelectedAvisosSystemType] = useState<{ id: string; name: string } | null>(null);

  // Auth form states
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    setAuthLoading(true);
    const { error } = await signInSuperAdmin(loginEmail, loginPassword);
    setAuthLoading(false);

    if (error) {
      toast({ title: 'Erro ao entrar', description: error.message, variant: 'destructive' });
    }
  };

  const handleSignOut = async () => {
    await signOutSuperAdmin();
    toast({ title: 'Desconectado', description: 'Você saiu do painel.' });
  };

  const handleCreateTenant = (systemTypeId: string) => {
    const systemType = systemTypes.find((st) => st.id === systemTypeId);
    setSelectedSystemType(systemType || null);
    setCreateDialogOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setEditDialogOpen(true);
  };

  const handleOpenAvisos = (systemTypeId: string, systemTypeName: string) => {
    setSelectedAvisosSystemType({ id: systemTypeId, name: systemTypeName });
    setAvisosDialogOpen(true);
  };

  const handleSubmitCreate = async (data: TenantFormData) => {
    await createTenant(data);
  };

  const handleSubmitEdit = async (id: string, data: Partial<TenantFormData>) => {
    await updateTenant(id, data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Estado 1: Não autenticado - mostrar APENAS login
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <Card className="max-w-md w-full relative z-10 bg-card/95 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-cormorant font-bold tracking-widest">
              VOUTI<span className="text-red-600">.</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Painel de Controle Master
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="admin@vouti.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={authLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={authLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado 2: Logado mas não é Super Admin - ACESSO NEGADO
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar este painel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Logado como: <strong>{currentUserEmail}</strong>
            </p>
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sair e tentar outra conta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado 3: É Super Admin - mostrar painel completo
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-cormorant font-bold tracking-widest text-primary">
                  VOUTI<span className="text-red-600">.</span>
                </h1>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Painel de Controle</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{currentUserEmail}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCredenciaisDialogOpen(true)}
                className="relative"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Credenciais
                {totalPendentes > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 min-w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {totalPendentes}
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="relative"
                disabled
                title="Pagamentos pendentes de aprovação"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pagamentos
                {totalPagamentosPendentes > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 min-w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {totalPagamentosPendentes}
                  </Badge>
                )}
              </Button>
              <SuperAdminThemeToggle />
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="tenants" className="space-y-6">
          <TabsList className="grid w-full max-w-7xl grid-cols-11">
            <TabsTrigger value="tenants" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <Headphones className="w-4 h-4" />
              Suporte
            </TabsTrigger>
            <TabsTrigger value="monitoramento" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Monitoramento
            </TabsTrigger>
            <TabsTrigger value="diagnostico" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Diagnóstico
            </TabsTrigger>
            <TabsTrigger value="teste-webhook" className="flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              Teste Webhook
            </TabsTrigger>
            <TabsTrigger value="teste-cnj" className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Teste CNJ
            </TabsTrigger>
            <TabsTrigger value="busca-geral" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Busca Geral
            </TabsTrigger>
            <TabsTrigger value="judit-docs" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Judit Docs
            </TabsTrigger>
            <TabsTrigger value="config-pix" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Config. PIX
            </TabsTrigger>
            <TabsTrigger value="authenticator" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Autenticador
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tenants">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Sistemas & Clientes</h2>
              <p className="text-muted-foreground">
                Gerencie todos os sistemas e clientes da plataforma VOUTI
              </p>
            </div>

            <div className="space-y-8">
              {systemTypes.map((systemType) => (
                <SystemTypeSection
                  key={systemType.id}
                  systemType={systemType}
                  tenants={getTenantsBySystemType(systemType.id)}
                  onCreateTenant={handleCreateTenant}
                  onEditTenant={handleEditTenant}
                  onToggleStatus={toggleTenantStatus}
                  onDeleteTenant={deleteTenant}
                  onOpenAvisos={handleOpenAvisos}
                  pagamentosPorTenant={pagamentosPorTenant}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="leads">
            <SuperAdminLeads />
          </TabsContent>

          <TabsContent value="support">
            <SuperAdminSupport />
          </TabsContent>

          <TabsContent value="monitoramento">
            <SuperAdminMonitoramento />
          </TabsContent>

          <TabsContent value="diagnostico">
            <SuperAdminDiagnosticoJudit />
          </TabsContent>

          <TabsContent value="teste-webhook">
            <SuperAdminWebhookTest />
          </TabsContent>

          <TabsContent value="teste-cnj">
            <SuperAdminImportCNJTest />
          </TabsContent>

          <TabsContent value="busca-geral">
            <SuperAdminBuscaGeral />
          </TabsContent>

          <TabsContent value="judit-docs">
            <SuperAdminJuditDocs />
          </TabsContent>

          <TabsContent value="config-pix">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Configuração de Pagamento PIX</h2>
              <p className="text-muted-foreground">
                Configure a chave PIX e QR Code que será exibido para os clientes
              </p>
            </div>
            <div className="max-w-2xl">
              <SuperAdminPixConfig />
            </div>
          </TabsContent>

          <TabsContent value="authenticator">
            <SuperAdminAuthenticator />
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs */}
      {selectedSystemType?.code === 'crm' ? (
        <CreateCrmTenantDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          systemType={selectedSystemType}
          onSubmit={handleSubmitCreate}
        />
      ) : (
        <CreateTenantDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          systemType={selectedSystemType}
          onSubmit={handleSubmitCreate}
        />
      )}

      <EditTenantDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        tenant={selectedTenant}
        onSubmit={handleSubmitEdit}
      />

      {selectedAvisosSystemType && (
        <SuperAdminAvisosDialog
          open={avisosDialogOpen}
          onOpenChange={setAvisosDialogOpen}
          systemTypeId={selectedAvisosSystemType.id}
          systemTypeName={selectedAvisosSystemType.name}
        />
      )}

      <CredenciaisCentralDialog
        open={credenciaisDialogOpen}
        onOpenChange={setCredenciaisDialogOpen}
      />
    </div>
  );
}
