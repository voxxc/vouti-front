import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Users } from 'lucide-react';

const AdminUsersManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [profilesRes, rolesRes, levelsRes, studentLevelsRes] = await Promise.all([
      supabase.from('spn_profiles').select('*'),
      supabase.from('spn_user_roles').select('*'),
      supabase.from('spn_levels').select('*').order('sort_order'),
      supabase.from('spn_student_levels').select('*'),
    ]);

    const profiles = (profilesRes.data as any[]) || [];
    const roles = (rolesRes.data as any[]) || [];
    const sLevels = (studentLevelsRes.data as any[]) || [];

    setLevels((levelsRes.data as any[]) || []);
    setUsers(profiles.map(p => ({
      ...p,
      roles: roles.filter(r => r.user_id === p.user_id).map(r => r.role),
      assignedLevels: sLevels.filter(sl => sl.user_id === p.user_id).map(sl => sl.level_id),
    })));
  };

  const changeRole = async (userId: string, newRole: string) => {
    // Remove existing roles
    await supabase.from('spn_user_roles').delete().eq('user_id', userId);
    // Insert new role
    const { error } = await supabase.from('spn_user_roles').insert({ user_id: userId, role: newRole as any });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Role updated' }); loadData(); }
  };

  const assignLevel = async (userId: string, levelId: string) => {
    const { error } = await supabase.from('spn_student_levels').upsert(
      { user_id: userId, level_id: levelId },
      { onConflict: 'user_id,level_id' }
    );
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Level assigned' }); loadData(); }
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    teacher: 'bg-blue-100 text-blue-700',
    student: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Users className="h-6 w-6" /> Manage Users
      </h1>

      <div className="space-y-3">
        {users.map(u => (
          <Card key={u.id}>
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-foreground">{u.full_name}</p>
                <p className="text-xs text-muted-foreground">{u.user_id}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Role:</span>
                <Select value={u.roles[0] || 'student'} onValueChange={v => changeRole(u.user_id, v)}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(u.roles.includes('student') || u.roles.length === 0) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Level:</span>
                  <Select value={u.assignedLevels[0] || ''} onValueChange={v => assignLevel(u.user_id, v)}>
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue placeholder="Assign level" />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-1">
                {u.roles.map((r: string) => (
                  <Badge key={r} variant="secondary" className={`text-xs ${roleColors[r] || ''}`}>
                    {r}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No users registered yet.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default AdminUsersManager;
