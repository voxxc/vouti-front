import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Users, UserPlus, Trash2, Loader2, Eye, EyeOff, Pencil, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AdminUsersManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'student' });
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ email: '', password: '' });
  const [editShowPass, setEditShowPass] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, levelsRes, studentLevelsRes, sessionRes] = await Promise.all([
      supabase.from('spn_profiles').select('*'),
      supabase.from('spn_user_roles').select('*'),
      supabase.from('spn_levels').select('*').order('sort_order'),
      supabase.from('spn_student_levels').select('*'),
      supabase.auth.getSession(),
    ]);

    const profiles = (profilesRes.data as any[]) || [];
    const roles = (rolesRes.data as any[]) || [];
    const sLevels = (studentLevelsRes.data as any[]) || [];

    let emails: Record<string, string> = {};
    const token = sessionRes.data.session?.access_token;
    if (token) {
      const emailsRes = await supabase.functions.invoke('spn-create-user', {
        body: { action: 'list_emails' },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (emailsRes.data?.emails) emails = emailsRes.data.emails;
    }

    setLevels((levelsRes.data as any[]) || []);
    setUsers(profiles.map(p => ({
      ...p,
      email: emails[p.user_id] || '',
      roles: roles.filter(r => r.user_id === p.user_id).map(r => r.role),
      assignedLevels: sLevels.filter(sl => sl.user_id === p.user_id).map(sl => sl.level_id),
    })));
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.full_name) {
      toast({ title: 'Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('spn-create-user', {
        body: { email: form.email, password: form.password, full_name: form.full_name, role: form.role },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || 'Failed to create user');
      }

      toast({ title: 'User created!', description: `${form.full_name} added as ${form.role}` });
      setForm({ email: '', password: '', full_name: '', role: 'student' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from SPN? This cannot be undone.`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('spn-create-user', {
        body: { action: 'delete', user_id: userId },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || 'Failed to delete');
      }

      toast({ title: 'User removed', description: `${name} was removed from SPN` });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({ email: user.email || '', password: '' });
    setEditShowPass(false);
  };

  const handleSaveCredentials = async () => {
    if (!editingUser) return;
    if (!editForm.email && !editForm.password) {
      toast({ title: 'Nothing to update', description: 'Fill email or password.' });
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setEditSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const res = await supabase.functions.invoke('spn-create-user', {
        body: {
          action: 'update_credentials',
          user_id: editingUser.user_id,
          ...(editForm.email ? { email: editForm.email } : {}),
          ...(editForm.password ? { password: editForm.password } : {}),
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || 'Failed to update');
      }
      toast({ title: 'Updated', description: `${editingUser.full_name} credentials changed.` });
      setEditingUser(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    await supabase.from('spn_user_roles').delete().eq('user_id', userId);
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
    admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    student: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Users className="h-6 w-6" /> Manage Users
      </h1>

      {/* Create User Form */}
      <Card className="border-primary/20">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Create New User
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                placeholder="John Doe"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="w-full sm:w-auto">
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Create User
          </Button>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="space-y-3">
        {loading ? (
          <Card><CardContent className="p-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent></Card>
        ) : users.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No users registered yet.
          </CardContent></Card>
        ) : users.map(u => (
          <Card key={u.id}>
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{u.full_name}</p>
                  <p
                    className="text-xs text-muted-foreground truncate flex items-center gap-1"
                    title={u.user_id}
                  >
                    <Mail className="h-3 w-3 shrink-0" />
                    {u.email || <span className="italic">no email</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  {u.roles.map((r: string) => (
                    <Badge key={r} variant="secondary" className={`text-xs ${roleColors[r] || ''}`}>
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Role:</span>
                  <Select value={u.roles[0] || 'student'} onValueChange={v => changeRole(u.user_id, v)}>
                    <SelectTrigger className="w-28 h-8 text-xs">
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
                      <SelectTrigger className="w-32 h-8 text-xs">
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

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => openEdit(u)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto h-8"
                  onClick={() => handleDelete(u.user_id, u.full_name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit credentials — {editingUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">New email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="Leave blank to keep current"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-pass">New password</Label>
              <div className="relative">
                <Input
                  id="edit-pass"
                  type={editShowPass ? 'text' : 'password'}
                  placeholder="Leave blank to keep current"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditShowPass(!editShowPass)}
                >
                  {editShowPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={editSaving}>Cancel</Button>
            <Button onClick={handleSaveCredentials} disabled={editSaving}>
              {editSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersManager;
