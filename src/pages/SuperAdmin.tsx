import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Loader2, ShieldCheck } from 'lucide-react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { SystemTypeSection } from '@/components/SuperAdmin/SystemTypeSection';
import { CreateTenantDialog } from '@/components/SuperAdmin/CreateTenantDialog';
import { EditTenantDialog } from '@/components/SuperAdmin/EditTenantDialog';
import { SystemType, Tenant, TenantFormData } from '@/types/superadmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SuperAdmin() {
  const {
    systemTypes,
    loading,
    isSuperAdmin,
    noSuperAdminsExist,
    currentUserEmail,
    createTenant,
    updateTenant,
    toggleTenantStatus,
    getTenantsBySystemType,
    becomeSuperAdmin,
  } = useSuperAdmin();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSystemType, setSelectedSystemType] = useState<SystemType | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

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

  // Bootstrap: allow first user to become super admin
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
            {currentUserEmail ? (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Você está logado como: <strong>{currentUserEmail}</strong>
                </p>
                <Button onClick={becomeSuperAdmin} className="w-full">
                  Tornar-me Super Admin
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Faça login primeiro para se tornar Super Admin.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

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
