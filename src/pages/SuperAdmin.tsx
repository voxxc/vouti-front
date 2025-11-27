import { useState } from 'react';
import { Shield, Loader2, ShieldCheck, Eye, EyeOff, LogOut } from 'lucide-react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { SystemTypeSection } from '@/components/SuperAdmin/SystemTypeSection';
import { CreateTenantDialog } from '@/components/SuperAdmin/CreateTenantDialog';
import { EditTenantDialog } from '@/components/SuperAdmin/EditTenantDialog';
import { SuperAdminThemeToggle } from '@/components/SuperAdmin/SuperAdminThemeToggle';
import { SystemType, Tenant, TenantFormData } from '@/types/superadmin';
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
    noSuperAdminsExist,
    currentUserEmail,
    session,
    createTenant,
    updateTenant,
    deleteTenant,
    toggleTenantStatus,
    getTenantsBySystemType,
    becomeSuperAdmin,
    signInSuperAdmin,
    signUpSuperAdmin,
    signOutSuperAdmin,
  } = useSuperAdmin();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSystemType, setSelectedSystemType] = useState<SystemType | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Auth form states
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPassword) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    if (signupPassword.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    setAuthLoading(true);
    const { error } = await signUpSuperAdmin(signupEmail, signupPassword, signupName);
    setAuthLoading(false);

    if (error) {
      toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Conta criada!', description: 'Você agora é um Super Admin.' });
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

  // Estado 1: Não autenticado - mostrar login/cadastro
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
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
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
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      disabled={authLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="admin@vouti.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      disabled={authLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
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
                    Criar Conta
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Ao criar uma conta, você será registrado como Super Admin.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado 2: Logado mas não é Super Admin
  if (!isSuperAdmin) {
    // Se não existem super admins, mostrar opção de bootstrap
    if (noSuperAdminsExist) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Configuração Inicial</CardTitle>
              <CardDescription>
                Nenhum Super Admin foi configurado ainda. Seja o primeiro!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Você está logado como: <strong>{currentUserEmail}</strong>
              </p>
              <Button onClick={becomeSuperAdmin} className="w-full">
                Tornar-me Super Admin
              </Button>
              <Button variant="outline" onClick={handleSignOut} className="w-full">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Já existem super admins mas este usuário não é um
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
            />
          ))}
        </div>
      </main>

      {/* Dialogs */}
      <CreateTenantDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        systemType={selectedSystemType}
        onSubmit={handleSubmitCreate}
      />

      <EditTenantDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        tenant={selectedTenant}
        onSubmit={handleSubmitEdit}
      />
    </div>
  );
}
