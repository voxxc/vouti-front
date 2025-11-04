import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Edit, Trash2, Search } from "lucide-react";
import { User } from "@/types/user";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserManagementProps {
  users: User[];
  onAddUser: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditUser: (userId: string, userData: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
}

const UserManagement = ({ users, onAddUser, onEditUser, onDeleteUser }: UserManagementProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'advogado' as 'admin' | 'advogado' | 'comercial' | 'financeiro' | 'controller' | 'agenda'
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'advogado' as 'admin' | 'advogado' | 'comercial' | 'financeiro' | 'controller' | 'agenda',
    password: '' // Optional - only update if provided
  });

  // Set up realtime subscription for profiles
  useEffect(() => {
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('New user created:', payload);
          toast({
            title: "Novo usuário",
            description: "Um novo usuário foi adicionado ao sistema",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Creating user with email:", formData.email);
      
      // Call edge function to create user without logging out admin
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.name,
          role: formData.role
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (data?.error) {
        console.error("Response error:", data.error);
        throw new Error(data.error);
      }

      console.log("User created successfully:", data.user);

      // Create the new user object
      const newUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.full_name,
        role: data.user.role,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add to parent's list
      onAddUser(newUser);

      toast({
        title: "Usuário criado",
        description: "O novo usuário foi criado com sucesso.",
      });

      setIsOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'advogado' });
    } catch (error: any) {
      console.error("Error creating user:", error);
      
      // Handle specific error messages
      let errorMessage = error.message || 'Erro ao criar usuário';
      
      if (errorMessage.includes('Email já cadastrado')) {
        errorMessage = 'Este email já está cadastrado no sistema';
      } else if (errorMessage.includes('Senha deve ter')) {
        errorMessage = 'A senha deve ter no mínimo 6 caracteres';
      } else if (errorMessage.includes('Sem permissão')) {
        errorMessage = 'Você não tem permissão para criar usuários';
      }

      toast({
        title: "Não foi possível criar o usuário",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role as 'admin' | 'advogado' | 'comercial' | 'financeiro' | 'controller' | 'agenda',
      password: '' // Reset password field
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);

    try {
      // Update profile (name and email)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: editFormData.name,
          email: editFormData.email
        })
        .eq('user_id', editingUser.id);

      if (profileError) throw profileError;

      // Update role in user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: editFormData.role })
        .eq('user_id', editingUser.id);

      if (roleError) throw roleError;

      // Update password if provided
      if (editFormData.password && editFormData.password.trim() !== '') {
        const { data, error: passwordError } = await supabase.functions.invoke('update-user-password', {
          body: {
            user_id: editingUser.id,
            new_password: editFormData.password
          }
        });

        if (passwordError) throw passwordError;
        if (data?.error) throw new Error(data.error);
      }

      onEditUser(editingUser.id, {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role
      });

      toast({
        title: "Sucesso",
        description: editFormData.password ? "Usuário e senha atualizados com sucesso!" : "Usuário atualizado com sucesso!",
      });

      setIsEditOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error('Error updating user:', error);
      
      let errorMessage = error.message || 'Erro ao atualizar usuário';
      
      if (errorMessage.includes('Senha deve ter')) {
        errorMessage = 'A senha deve ter no mínimo 6 caracteres';
      }

      toast({
        title: "Erro ao atualizar",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário ${userName}?`)) {
      return;
    }

    setLoading(true);
    try {
      // Call edge function to delete user from auth.users
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;

      onDeleteUser(userId);

      toast({
        title: "Sucesso",
        description: "Usuário deletado com sucesso!",
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao deletar usuário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus size={16} />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Perfil</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as 'admin' | 'advogado' | 'comercial' | 'financeiro' | 'controller' | 'agenda' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advogado">Advogado</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="controller">Controlador</SelectItem>
                    <SelectItem value="agenda">Agenda</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar Usuário"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-password">Nova Senha (opcional)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  placeholder="Deixe em branco para manter a senha atual"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo de 6 caracteres. Deixe vazio para não alterar.
                </p>
              </div>
              <div>
                <Label htmlFor="edit-role">Perfil</Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(value) => setEditFormData({ ...editFormData, role: value as 'admin' | 'advogado' | 'comercial' | 'financeiro' | 'controller' | 'agenda' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advogado">Advogado</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="controller">Controlador</SelectItem>
                    <SelectItem value="agenda">Agenda</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuários por nome, email ou perfil..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-sm">{user.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 gap-2"
                  onClick={() => handleEdit(user)}
                  disabled={loading}
                >
                  <Edit size={14} />
                  Editar
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive"
                  onClick={() => handleDelete(user.id, user.name)}
                  disabled={loading}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;