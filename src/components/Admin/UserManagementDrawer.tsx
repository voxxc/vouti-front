import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Plus, Search, Pencil, CheckCircle2, KeyRound, Loader2, Trash2 } from "lucide-react";
import { User } from "@/types/user";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenantId } from "@/hooks/useTenantId";
import { usePlanoLimites } from "@/hooks/usePlanoLimites";

interface UserManagementDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  onAddUser: () => void;
  onEditUser: (userId: string, userData: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
  isLoading?: boolean;
}

const ADDITIONAL_PERMISSIONS = [
  { id: 'agenda', role: 'agenda', label: 'Agenda' },
  { id: 'clientes', role: 'comercial', label: 'Clientes' },
  { id: 'financeiro', role: 'financeiro', label: 'Financeiro' },
  { id: 'controladoria', role: 'controller', label: 'Controladoria' },
  { id: 'reunioes', role: 'reunioes', label: 'Reuniões' },
];

const ROLE_OPTIONS = [
  { value: 'advogado', label: 'Advogado' },
  { value: 'estagiario', label: 'Estagiário(a)' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'controller', label: 'Controller' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'perito', label: 'Perito' },
  { value: 'admin', label: 'Administrador' },
];

export function UserManagementDrawer({
  open,
  onOpenChange,
  users,
  onAddUser,
  onEditUser,
  onDeleteUser,
  isLoading = false
}: UserManagementDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [editUserTenantId, setEditUserTenantId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'advogado' as User['role'],
    additionalPermissions: [] as string[]
  });
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'advogado' as User['role'],
    additionalPermissions: [] as string[]
  });
  
  const { toast } = useToast();
  const { tenantId } = useTenantId();
  const { podeAdicionarUsuario } = usePlanoLimites();

  // State for 2FA wallet management
  const [tenantWallets, setTenantWallets] = useState<Array<{ id: string; name: string }>>([]);
  const [userWalletViewerIds, setUserWalletViewerIds] = useState<Set<string>>(new Set());
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [togglingWalletId, setTogglingWalletId] = useState<string | null>(null);

  const isEditingAdminOrController = editFormData.role === 'admin' || editFormData.role === 'controller' ||
    editFormData.additionalPermissions.includes('controller');

  // Fetch wallets when edit dialog opens
  useEffect(() => {
    if (!isEditOpen || !editingUser || !editUserTenantId || isEditingAdminOrController) {
      setTenantWallets([]);
      setUserWalletViewerIds(new Set());
      return;
    }

    const fetchWallets = async () => {
      setWalletsLoading(true);
      try {
        const [walletsRes, viewersRes] = await Promise.all([
          supabase
            .from('totp_wallets')
            .select('id, name')
            .eq('tenant_id', editUserTenantId)
            .order('created_at', { ascending: true }),
          supabase
            .from('totp_wallet_viewers')
            .select('wallet_id')
            .eq('user_id', editingUser.id)
            .eq('tenant_id', editUserTenantId)
        ]);

        setTenantWallets(walletsRes.data || []);
        setUserWalletViewerIds(new Set((viewersRes.data || []).map(v => v.wallet_id)));
      } catch (error) {
        console.error('Error fetching wallets:', error);
      } finally {
        setWalletsLoading(false);
      }
    };

    fetchWallets();
  }, [isEditOpen, editingUser?.id, editUserTenantId, isEditingAdminOrController]);

  const handleWalletToggle = async (walletId: string) => {
    if (!editingUser || !editUserTenantId) return;
    setTogglingWalletId(walletId);

    const isCurrentlyGranted = userWalletViewerIds.has(walletId);

    try {
      if (isCurrentlyGranted) {
        const { error } = await supabase
          .from('totp_wallet_viewers')
          .delete()
          .eq('wallet_id', walletId)
          .eq('user_id', editingUser.id)
          .eq('tenant_id', editUserTenantId);
        if (error) throw error;
        setUserWalletViewerIds(prev => { const next = new Set(prev); next.delete(walletId); return next; });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('totp_wallet_viewers')
          .insert({
            wallet_id: walletId,
            user_id: editingUser.id,
            tenant_id: editUserTenantId,
            granted_by: user?.id || null
          });
        if (error) throw error;
        setUserWalletViewerIds(prev => new Set(prev).add(walletId));
      }
    } catch (error) {
      console.error('Error toggling wallet access:', error);
      toast({ title: "Erro", description: "Erro ao alterar acesso à carteira", variant: "destructive" });
    } finally {
      setTogglingWalletId(null);
    }
  };
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const handleUserClick = async (user: User) => {
    setEditingUser(user);
    setLoading(true);

    try {
      // Buscar tenant_id do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tenant_id) {
        toast({ title: "Erro", description: "Perfil do usuário não encontrado", variant: "destructive" });
        return;
      }

      setEditUserTenantId(profile.tenant_id);

      // Buscar roles do usuário
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role, is_primary')
        .eq('user_id', user.id)
        .eq('tenant_id', profile.tenant_id);

      // Determinar role principal (is_primary ou primeira da lista)
      const primaryRole = userRoles?.find(r => r.is_primary)?.role || 
                         userRoles?.[0]?.role || 
                         'advogado';

      // Roles adicionais (excluindo a principal)
      const additionalRoles = userRoles
        ?.filter(r => r.role !== primaryRole)
        .map(r => r.role) || [];

      setEditFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: primaryRole as User['role'],
        additionalPermissions: additionalRoles
      });

      setIsEditOpen(true);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({ title: "Erro", description: "Erro ao carregar dados do usuário", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editUserTenantId) return;

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Erro", description: "Sessão expirada", variant: "destructive" });
        return;
      }

      // Refresh token antes das chamadas
      await supabase.auth.refreshSession();
      const { data: { session: refreshedSession } } = await supabase.auth.getSession();
      const token = refreshedSession?.access_token;

      // 1. Atualizar email se mudou
      if (editFormData.email !== editingUser.email) {
        const emailResponse = await supabase.functions.invoke('update-user-email', {
          body: { user_id: editingUser.id, new_email: editFormData.email },
          headers: { Authorization: `Bearer ${token}` }
        });

        if (emailResponse.error) {
          throw new Error(emailResponse.error.message || 'Erro ao atualizar email');
        }
      }

      // 2. Atualizar nome no profile
      if (editFormData.name !== editingUser.name) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: editFormData.name })
          .eq('user_id', editingUser.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      // 3. Atualizar roles via Edge Function
      const rolesResponse = await supabase.functions.invoke('admin-set-user-roles', {
        body: {
          target_user_id: editingUser.id,
          tenant_id: editUserTenantId,
          primary_role: editFormData.role,
          additional_roles: editFormData.additionalPermissions
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (rolesResponse.error) {
        const errorMsg = rolesResponse.data?.error || rolesResponse.error.message;
        throw new Error(errorMsg);
      }

      // 4. Atualizar senha se fornecida
      if (editFormData.password && editFormData.password.length >= 6) {
        const passwordResponse = await supabase.functions.invoke('update-user-password', {
          body: { user_id: editingUser.id, new_password: editFormData.password },
          headers: { Authorization: `Bearer ${token}` }
        });

        if (passwordResponse.error) {
          throw new Error(passwordResponse.error.message || 'Erro ao atualizar senha');
        }
      }

      // 5. Chamar callback de edição
      onEditUser(editingUser.id, {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role
      });

      toast({ title: "Sucesso", description: "Usuário atualizado com sucesso" });
      setIsEditOpen(false);
      setEditingUser(null);

    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({ 
        title: "Erro", 
        description: error.message || "Erro ao atualizar usuário", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionRole: string, formType: 'edit' | 'create' = 'edit') => {
    const setter = formType === 'create' ? setCreateFormData : setEditFormData;
    setter(prev => ({
      ...prev,
      additionalPermissions: prev.additionalPermissions.includes(permissionRole)
        ? prev.additionalPermissions.filter(p => p !== permissionRole)
        : [...prev.additionalPermissions, permissionRole]
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    if (!podeAdicionarUsuario()) {
      toast({ title: "Limite atingido", description: "O limite de usuários do plano foi atingido.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Verificar sessão ativa
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Erro", description: "Faça login como administrador antes de criar usuários.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Refresh token para garantir validade
      await supabase.auth.refreshSession();
      const { data: { session: refreshedSession } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: createFormData.email,
          password: createFormData.password,
          full_name: createFormData.name,
          role: createFormData.role,
          additional_roles: createFormData.additionalPermissions,
          tenant_id: tenantId
        },
        headers: {
          Authorization: `Bearer ${refreshedSession?.access_token}`
        }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast({ title: "Sucesso", description: "Usuário criado com sucesso" });
      setIsCreateOpen(false);
      setCreateFormData({ name: '', email: '', password: '', role: 'advogado', additionalPermissions: [] });
      onAddUser(); // refresh list
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({ title: "Erro", description: error.message || "Erro ao criar usuário", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createAvailablePermissions = ADDITIONAL_PERMISSIONS.filter(
    p => p.role !== createFormData.role
  );

  const getRoleBadgeVariant = (role: string) => {
    return role === 'admin' ? 'default' : 'secondary';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      advogado: 'Advogado',
      comercial: 'Comercial',
      financeiro: 'Financeiro',
      controller: 'Controller',
      agenda: 'Agenda',
      reunioes: 'Reuniões',
      estagiario: 'Estagiário(a)',
      perito: 'Perito'
    };
    return labels[role] || role;
  };

  // Filtra permissões adicionais para não mostrar a role principal
  const availablePermissions = ADDITIONAL_PERMISSIONS.filter(
    p => p.role !== editFormData.role
  );

  const selectedPermissionsLabels = editFormData.additionalPermissions
    .map(role => ADDITIONAL_PERMISSIONS.find(p => p.role === role)?.label)
    .filter(Boolean);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
        <SheetContent 
          side="right-offset"
          className="p-0 flex flex-col"
        >
          <SheetTitle className="sr-only">Usuários</SheetTitle>
          
          {/* Barra decorativa no lado esquerdo */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary/20 via-border to-primary/20 pointer-events-none" />
          
          {/* Header */}
          <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">Usuários</span>
          </div>

          {/* Conteudo scrollavel */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
              {/* Botão novo usuario */}
              <Button 
                size="sm" 
                className="gap-2" 
                onClick={() => {
                  if (!podeAdicionarUsuario()) {
                    toast({ title: "Limite atingido", description: "O limite de usuários do plano foi atingido.", variant: "destructive" });
                    return;
                  }
                  setIsCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Novo Usuário
              </Button>

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar usuários..." 
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Lista de usuarios */}
              <div className="space-y-1">
                {isLoading ? (
                  // Skeleton loading
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-3 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {searchQuery ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserClick(user)}
                      className="w-full text-left p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {user.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>
                        <Pencil 
                          className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 
                                     hover:text-primary transition-all shrink-0" 
                        />
                        <Badge 
                          variant={getRoleBadgeVariant(user.role)} 
                          className="ml-2 shrink-0 text-xs"
                        >
                          {getRoleLabel(user.role)}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Dialog de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                required
              />
            </div>

            {/* Nova Senha */}
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nova Senha (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 6 caracteres. Deixe vazio para manter a senha atual.
              </p>
            </div>

            {/* Perfil Principal */}
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value) => setEditFormData(prev => ({ 
                  ...prev, 
                  role: value as User['role'],
                  // Remove a nova role principal das permissões adicionais
                  additionalPermissions: prev.additionalPermissions.filter(p => p !== value)
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permissões Adicionais */}
            <div className="space-y-3">
              <div>
                <Label>Permissões Adicionais</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Áreas extras que este usuário terá acesso além do perfil principal.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {availablePermissions.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${permission.id}`}
                      checked={editFormData.additionalPermissions.includes(permission.role)}
                      onCheckedChange={() => handlePermissionToggle(permission.role, 'edit')}
                    />
                    <Label 
                      htmlFor={`perm-${permission.id}`} 
                      className="text-sm font-normal cursor-pointer"
                    >
                      {permission.label}
                    </Label>
                  </div>
                ))}
              </div>

              {selectedPermissionsLabels.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span>Selecionadas: {selectedPermissionsLabels.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Carteiras 2FA */}
            {!isEditingAdminOrController && tenantWallets.length > 0 && (
              <div className="space-y-3">
                <div>
                  <Label className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    Carteiras 2FA
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Selecione quais carteiras TOTP este usuário poderá visualizar. Salva instantaneamente.
                  </p>
                </div>

                {walletsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Carregando carteiras...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {tenantWallets.map((wallet) => (
                      <div key={wallet.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`wallet-${wallet.id}`}
                          checked={userWalletViewerIds.has(wallet.id)}
                          disabled={togglingWalletId === wallet.id}
                          onCheckedChange={() => handleWalletToggle(wallet.id)}
                        />
                        <Label
                          htmlFor={`wallet-${wallet.id}`}
                          className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                        >
                          {wallet.name}
                          {togglingWalletId === wallet.id && (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Separador e Botão Apagar */}
            <Separator />
            <Button
              type="button"
              variant="destructive"
              className="w-full gap-2"
              disabled={loading || deletingUser}
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              {deletingUser ? "Apagando..." : "Apagar Usuário"}
            </Button>

            {/* Botão Salvar */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Criação */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome</Label>
              <Input
                id="create-name"
                value={createFormData.name}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Senha</Label>
              <Input
                id="create-password"
                type="password"
                value={createFormData.password}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                minLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
            </div>

            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select
                value={createFormData.role}
                onValueChange={(value) => setCreateFormData(prev => ({
                  ...prev,
                  role: value as User['role'],
                  additionalPermissions: prev.additionalPermissions.filter(p => p !== value)
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Permissões Adicionais</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Áreas extras que este usuário terá acesso.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {createAvailablePermissions.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`create-perm-${permission.id}`}
                      checked={createFormData.additionalPermissions.includes(permission.role)}
                      onCheckedChange={() => handlePermissionToggle(permission.role, 'create')}
                    />
                    <Label
                      htmlFor={`create-perm-${permission.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {permission.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando..." : "Criar Usuário"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
