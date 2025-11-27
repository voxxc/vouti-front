import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Briefcase, Scale, FolderKanban, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tenant } from '@/types/superadmin';

interface TenantStatsDialogProps {
  tenant: Tenant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TenantStats {
  totalUsers: number;
  totalClientes: number;
  totalProcessos: number;
  totalProjects: number;
}

export function TenantStatsDialog({ tenant, open, onOpenChange }: TenantStatsDialogProps) {
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchStats();
    }
  }, [open, tenant.id]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [usersResult, clientesResult, processosResult, projectsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
        supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
        supabase.from('processos').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        totalClientes: clientesResult.count || 0,
        totalProcessos: processosResult.count || 0,
        totalProjects: projectsResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching tenant stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statItems = [
    { label: 'Usuários', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-500' },
    { label: 'Clientes', value: stats?.totalClientes ?? 0, icon: Briefcase, color: 'text-green-500' },
    { label: 'Processos', value: stats?.totalProcessos ?? 0, icon: Scale, color: 'text-purple-500' },
    { label: 'Projetos', value: stats?.totalProjects ?? 0, icon: FolderKanban, color: 'text-orange-500' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Estatísticas - {tenant.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 py-4">
            {statItems.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border border-border"
              >
                <item.icon className={`h-8 w-8 mb-2 ${item.color}`} />
                <span className="text-2xl font-bold text-foreground">{item.value}</span>
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
