import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, KeyRound, Trash2, Search, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditUserDialog } from './EditUserDialog';
import { ChangeUserPasswordDialog } from './ChangeUserPasswordDialog';

interface UserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  is_super_admin: boolean;
  roles: string[];
}

interface TenantOption {
  id: string;
  name: string;
}

interface SuperAdminUsersListProps {
  /** When set, the list is filtered to that tenant and the tenant filter is hidden. */
  fixedTenantId?: string;
  /** Hide super admin badge column (used in per-tenant drawer). */
  hideSuperAdmins?: boolean;
  /** Callback once a user is updated/deleted, to allow parent refresh. */
  onChange?: () => void;
}

const RESTRICTED_DOMAINS = ['@metalsystem.local', '@vouti.bio', '@vlink.bio'];

export function SuperAdminUsersList({ fixedTenantId, hideSuperAdmins, onChange }: SuperAdminUsersListProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [changingPassword, setChangingPassword] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes, tenantsRes, superAdminsRes, sessionRes] = await Promise.all([
        supabase.from('profiles').select('user_id, email, full_name, tenant_id'),
        supabase.from('user_roles').select('user_id, role, tenant_id'),
        supabase.from('tenants').select('id, name').order('name'),
        supabase.from('super_admins').select('user_id'),
        supabase.auth.getSession(),
      ]);

      setCurrentUserId(sessionRes.data.session?.user?.id ?? null);

      const tenantList: TenantOption[] = (tenantsRes.data ?? []).map((t) => ({ id: t.id, name: t.name }));
      setTenants(tenantList);
      const tenantById = new Map(tenantList.map((t) => [t.id, t.name]));
      const superSet = new Set((superAdminsRes.data ?? []).map((s) => s.user_id));

      const rolesByUser = new Map<string, string[]>();
      for (const r of rolesRes.data ?? []) {
        if (fixedTenantId && r.tenant_id !== fixedTenantId) continue;
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesByUser.set(r.user_id, arr);
      }

      const rows: UserRow[] = [];
      for (const p of profilesRes.data ?? []) {
        if (!p.email) continue;
        if (RESTRICTED_DOMAINS.some((d) => p.email!.toLowerCase().includes(d))) continue;
        const isSuper = superSet.has(p.user_id);
        if (hideSuperAdmins && isSuper) continue;
        if (fixedTenantId && p.tenant_id !== fixedTenantId && !isSuper) continue;
        rows.push({
          user_id: p.user_id,
          email: p.email,
          full_name: p.full_name,
          tenant_id: p.tenant_id,
          tenant_name: p.tenant_id ? tenantById.get(p.tenant_id) ?? null : null,
          is_super_admin: isSuper,
          roles: rolesByUser.get(p.user_id) ?? [],
        });
      }

      // Add super admins that may not have a profile entry but should still appear in the global list
      if (!fixedTenantId && !hideSuperAdmins) {
        const existingIds = new Set(rows.map((r) => r.user_id));
        for (const sId of superSet) {
          if (existingIds.has(sId)) continue;
          rows.push({
            user_id: sId,
            email: null,
            full_name: null,
            tenant_id: null,
            tenant_name: null,
            is_super_admin: true,
            roles: [],
          });
        }
      }

      setUsers(rows);
    } catch (error) {
      console.error('Erro ao carregar usuarios:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar usuarios.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedTenantId, hideSuperAdmins]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (tenantFilter !== 'all' && !fixedTenantId) {
        if (tenantFilter === 'none' && u.tenant_id) return false;
        if (tenantFilter !== 'none' && u.tenant_id !== tenantFilter) return false;
      }
      if (!term) return true;
      return (
        (u.email ?? '').toLowerCase().includes(term) ||
        (u.full_name ?? '').toLowerCase().includes(term)
      );
    });
  }, [users, search, tenantFilter, fixedTenantId]);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    const { data, error } = await supabase.functions.invoke('super-admin-delete-user', {
      body: { user_id: deleting.user_id },
    });
    setDeleteLoading(false);
    const errMsg = (data as { error?: string } | null)?.error || error?.message;
    if (errMsg) {
      toast({ title: 'Erro', description: errMsg, variant: 'destructive' });
      return;
    }
    toast({ title: 'Usuario excluido', description: `${deleting.email} foi removido.` });
    setDeleting(null);
    await loadData();
    onChange?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="pl-9"
          />
        </div>
        {!fixedTenantId && (
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Filtrar por cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              <SelectItem value="none">Sem cliente (super admins)</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
        </Button>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              {!fixedTenantId && <TableHead>Cliente</TableHead>}
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={fixedTenantId ? 4 : 5} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin inline" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={fixedTenantId ? 4 : 5} className="text-center py-8 text-muted-foreground">
                  Nenhum usuario encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {u.full_name || '—'}
                      {u.is_super_admin && (
                        <Badge variant="secondary" className="gap-1">
                          <ShieldCheck className="h-3 w-3" /> Super Admin
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email ?? '—'}</TableCell>
                  {!fixedTenantId && (
                    <TableCell className="text-muted-foreground">{u.tenant_name ?? '—'}</TableCell>
                  )}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        u.roles.map((r) => (
                          <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar nome/email" onClick={() => setEditing(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Trocar senha" onClick={() => setChangingPassword(u)}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Excluir usuario"
                        onClick={() => setDeleting(u)}
                        disabled={u.user_id === currentUserId}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditUserDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        user={editing}
        onSuccess={() => {
          loadData();
          onChange?.();
        }}
      />

      <ChangeUserPasswordDialog
        open={!!changingPassword}
        onOpenChange={(o) => !o && setChangingPassword(null)}
        user={changingPassword}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Excluir usuario</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleting?.email}</strong>? Esta acao e irreversivel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}