import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, UserCog, Loader2 } from 'lucide-react';

type AppRole = 'admin' | 'controller' | 'advogado' | 'comercial' | 'financeiro';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  controller: 'Controlador',
  advogado: 'Advogado',
  comercial: 'Comercial',
  financeiro: 'Financeiro',
};

const roleVariants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
  admin: 'destructive',
  controller: 'secondary',
  advogado: 'outline',
  comercial: 'secondary',
  financeiro: 'secondary',
};

export default function RoleManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Buscar perfis de usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Buscar roles de cada usuário
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combinar dados
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => ({
        id: profile.user_id,
        email: profile.email || '',
        full_name: profile.full_name || profile.email || 'Sem nome',
        roles: (userRoles || [])
          .filter((ur) => ur.user_id === profile.user_id)
          .map((ur) => ur.role),
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addRole = async (userId: string, role: string) => {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: role as any });

      if (error) throw error;

      toast({
        title: 'Role adicionada',
        description: `Role "${roleLabels[role as AppRole] || role}" adicionada com sucesso.`,
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar role',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const removeRole = async (userId: string, role: string) => {
    // Não permitir remover a última role
    const user = users.find((u) => u.id === userId);
    if (user && user.roles.length === 1) {
      toast({
        title: 'Não é possível remover',
        description: 'O usuário deve ter pelo menos uma role.',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);

      if (error) throw error;

      toast({
        title: 'Role removida',
        description: `Role "${roleLabels[role as AppRole] || role}" removida com sucesso.`,
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover role',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Gerenciamento de Roles
        </CardTitle>
        <CardDescription>
          Gerencie as permissões dos usuários do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex-1">
                <div className="font-medium">{user.full_name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {user.roles.map((role) => (
                    <Badge
                      key={role}
                      variant={roleVariants[role] || 'outline'}
                      className="cursor-pointer"
                      onClick={() => removeRole(user.id, role)}
                    >
                      {roleLabels[role as AppRole] || role} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Select
                  onValueChange={(value) => addRole(user.id, value)}
                  disabled={updating === user.id}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Adicionar role" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(roleLabels) as AppRole[])
                      .filter((role) => !user.roles.includes(role))
                      .map((role) => (
                        <SelectItem key={role} value={role}>
                          <span className="flex items-center gap-2">
                            <UserCog className="h-4 w-4" />
                            {roleLabels[role as AppRole]}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Nenhum usuário encontrado
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
