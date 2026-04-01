import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Info, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type Hotfix = {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'info';
  status: 'pending' | 'done';
  category: string | null;
  affected_resource: string | null;
  identified_at: string | null;
  resolved_at: string | null;
  notes: string | null;
};

const severityConfig = {
  critical: { label: 'Crítico', icon: ShieldAlert, color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  high: { label: 'Alto', icon: AlertTriangle, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  medium: { label: 'Médio', icon: Shield, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  info: { label: 'Info', icon: Info, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

const categoryLabels: Record<string, string> = {
  rls: 'RLS',
  storage: 'Storage',
  edge_function: 'Edge Function',
  xss: 'XSS',
  auth: 'Autenticação',
  realtime: 'Realtime',
};

type FilterStatus = 'all' | 'pending' | 'done';

export function SuperAdminSecurity() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const queryClient = useQueryClient();

  const { data: hotfixes = [], isLoading } = useQuery({
    queryKey: ['security-hotfixes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('super_admin_security_hotfixes')
        .select('*')
        .order('severity', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Hotfix[];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('super_admin_security_hotfixes')
        .update({ status: 'done', resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-hotfixes'] });
      toast({ title: 'Hotfix marcado como concluído' });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('super_admin_security_hotfixes')
        .update({ status: 'pending', resolved_at: null, resolved_by: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-hotfixes'] });
      toast({ title: 'Hotfix reaberto' });
    },
  });

  const severityOrder = ['critical', 'high', 'medium', 'info'] as const;

  const filtered = hotfixes.filter(h => filterStatus === 'all' || h.status === filterStatus);

  const grouped = severityOrder.reduce((acc, sev) => {
    const items = filtered.filter(h => h.severity === sev);
    if (items.length > 0) acc.push({ severity: sev, items });
    return acc;
  }, [] as { severity: typeof severityOrder[number]; items: Hotfix[] }[]);

  const pendingCount = hotfixes.filter(h => h.status === 'pending').length;
  const doneCount = hotfixes.filter(h => h.status === 'done').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Segurança & Hotfixes</h2>
        <p className="text-muted-foreground">
          Vulnerabilidades identificadas no sistema. Marque como concluído após aplicar a correção.
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
          <Clock className="h-4 w-4" />
          {pendingCount} pendentes
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 text-green-600 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          {doneCount} concluídos
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'done'] as FilterStatus[]).map(s => (
          <Button
            key={s}
            variant={filterStatus === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(s)}
          >
            {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendentes' : 'Concluídos'}
          </Button>
        ))}
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum hotfix encontrado com esse filtro.</p>
        </div>
      ) : (
        grouped.map(({ severity, items }) => {
          const config = severityConfig[severity];
          const Icon = config.icon;
          return (
            <div key={severity} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                <h3 className="font-semibold text-lg">{config.label}</h3>
                <Badge variant="outline" className={config.color}>{items.length}</Badge>
              </div>
              <div className="grid gap-3">
                {items.map(hotfix => (
                  <Card key={hotfix.id} className={hotfix.status === 'done' ? 'opacity-60' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <CardTitle className="text-base">{hotfix.title}</CardTitle>
                            <Badge variant="outline" className={config.color}>{config.label}</Badge>
                            {hotfix.category && (
                              <Badge variant="secondary" className="text-xs">
                                {categoryLabels[hotfix.category] || hotfix.category}
                              </Badge>
                            )}
                            {hotfix.status === 'done' && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Concluído
                              </Badge>
                            )}
                          </div>
                          {hotfix.affected_resource && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {hotfix.affected_resource}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {hotfix.status === 'pending' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolveMutation.mutate(hotfix.id)}
                              disabled={resolveMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Concluir
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => reopenMutation.mutate(hotfix.id)}
                              disabled={reopenMutation.isPending}
                            >
                              Reabrir
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{hotfix.description}</p>
                      {hotfix.resolved_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Resolvido em: {new Date(hotfix.resolved_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
