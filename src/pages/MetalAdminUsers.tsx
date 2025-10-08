import { useEffect, useState } from 'react';
import { useMetalAuth } from '@/contexts/MetalAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, User, Plus, Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import type { MetalProfile } from '@/types/metal';
import { CreateUserDialog } from '@/components/Metal/CreateUserDialog';
import { EditUserDialog } from '@/components/Metal/EditUserDialog';
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

interface UserWithRole extends MetalProfile {
  is_admin: boolean;
}

const SETORES = [
  'Projeto 1',
  'Almoxarifado',
  'Projeto 2',
  'Programação',
  'Guilhotina',
  'Corte a laser',
  'Dobra',
  'Montagem',
  'Acabamento',
  'Expedição',
  'Entrega'
];

const MetalAdminUsers = () => {
  const { user, isAdmin, signOut } = useMetalAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MetalProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<MetalProfile | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/metal-auth');
      return;
    }

    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem acessar esta página.",
        variant: "destructive",
      });
      navigate('/metal-dashboard');
      return;
    }

    loadUsers();
  }, [user, isAdmin, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('metal_profiles' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('metal_user_roles' as any)
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(adminRoles?.map((r: any) => r.user_id) || []);

      const usersWithRoles: UserWithRole[] = profiles?.map((profile: any) => ({
        ...profile,
        is_admin: adminUserIds.has(profile.user_id),
      })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserSetor = async (userId: string, setor: string) => {
    try {
      const { error } = await supabase
        .from('metal_profiles' as any)
        .update({ setor })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Setor atualizado",
        description: "O setor do usuário foi atualizado com sucesso.",
      });

      loadUsers();
    } catch (error) {
      console.error('Error updating setor:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o setor.",
        variant: "destructive",
      });
    }
  };

  const toggleAdminRole = async (userId: string, currentIsAdmin: boolean) => {
    try {
      if (currentIsAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('metal_user_roles' as any)
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;

        toast({
          title: "Admin removido",
          description: "Permissões de administrador removidas.",
        });
      } else {
        // Add admin role
        const { error } = await supabase
          .from('metal_user_roles' as any)
          .insert({
            user_id: userId,
            role: 'admin',
          });

        if (error) throw error;

        toast({
          title: "Admin adicionado",
          description: "Permissões de administrador concedidas.",
        });
      }

      loadUsers();
    } catch (error) {
      console.error('Error toggling admin role:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as permissões.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada");

      const response = await fetch(
        `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/delete-metal-user`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: userToDelete.user_id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao deletar usuário");
      }

      toast({
        title: "Usuário deletado",
        description: "O usuário foi removido do sistema com sucesso.",
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      console.error("Erro ao deletar usuário:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível deletar o usuário.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/90 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/metal-dashboard')}
                className="border-orange-500 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">Gerenciamento de Usuários</h1>
                <p className="text-sm text-slate-400">MetalSystem - Administração</p>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Usuários do Sistema</CardTitle>
                <CardDescription className="text-slate-400">
                  Configure setores e permissões dos usuários
                </CardDescription>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-400">
                Carregando usuários...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Nome</TableHead>
                    <TableHead className="text-slate-300">Login</TableHead>
                    <TableHead className="text-slate-300">Setor</TableHead>
                    <TableHead className="text-slate-300">Permissão</TableHead>
                    <TableHead className="text-slate-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-slate-700">
                      <TableCell className="text-white font-medium">
                        {user.full_name || 'Sem nome'}
                      </TableCell>
                      <TableCell className="text-slate-300">{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.setor || 'sem_setor'}
                          onValueChange={(value) => 
                            updateUserSetor(user.user_id, value === 'sem_setor' ? '' : value)
                          }
                        >
                          <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sem_setor">Sem setor</SelectItem>
                            {SETORES.map((setor) => (
                              <SelectItem key={setor} value={setor}>
                                {setor}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-600 text-slate-400">
                            <User className="w-3 h-3 mr-1" />
                            Operador
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAdminRole(user.user_id, user.is_admin)}
                            className={
                              user.is_admin
                                ? 'border-red-500/50 text-red-400 hover:bg-red-500/10'
                                : 'border-green-500/50 text-green-400 hover:bg-green-500/10'
                            }
                          >
                            {user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUserToDelete(user);
                              setDeleteDialogOpen(true);
                            }}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Deletar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <CreateUserDialog 
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={loadUsers}
        />

        <EditUserDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={loadUsers}
          user={selectedUser}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                Tem certeza que deseja deletar o usuário <strong>{userToDelete?.full_name}</strong>?
                Esta ação não pode ser desfeita e removerá todos os dados associados a este usuário.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default MetalAdminUsers;
