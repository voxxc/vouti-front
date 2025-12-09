import { useState, useEffect } from 'react';
import { Activity, Search, FileText, Radar, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Tenant } from '@/types/superadmin';

interface TenantJuditLogsDialogProps {
  tenant: Tenant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface JuditLog {
  id: string;
  tipo_chamada: string;
  endpoint: string;
  metodo: string;
  request_id: string | null;
  sucesso: boolean;
  resposta_status: number | null;
  erro_mensagem: string | null;
  custo_estimado: number;
  created_at: string;
}

interface LogSummary {
  total: number;
  requestDocument: number;
  lawsuitCnj: number;
  tracking: number;
  custoTotal: number;
}

export function TenantJuditLogsDialog({ tenant, open, onOpenChange }: TenantJuditLogsDialogProps) {
  const [logs, setLogs] = useState<JuditLog[]>([]);
  const [summary, setSummary] = useState<LogSummary>({
    total: 0,
    requestDocument: 0,
    lawsuitCnj: 0,
    tracking: 0,
    custoTotal: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && tenant.id) {
      fetchLogs();
    }
  }, [open, tenant.id]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('judit_api_logs')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const logsData = (data || []) as JuditLog[];
      setLogs(logsData);

      // Calcular resumo
      const newSummary: LogSummary = {
        total: logsData.length,
        requestDocument: logsData.filter(l => l.tipo_chamada === 'request-document').length,
        lawsuitCnj: logsData.filter(l => l.tipo_chamada === 'lawsuit_cnj').length,
        tracking: logsData.filter(l => l.tipo_chamada === 'tracking').length,
        custoTotal: logsData.reduce((acc, l) => acc + (Number(l.custo_estimado) || 0), 0),
      };
      setSummary(newSummary);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'request-document':
        return 'Busca OAB';
      case 'lawsuit_cnj':
        return 'Detalhes Processo';
      case 'tracking':
        return 'Monitoramento';
      default:
        return tipo;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'request-document':
        return <Search className="h-4 w-4" />;
      case 'lawsuit_cnj':
        return <FileText className="h-4 w-4" />;
      case 'tracking':
        return <Radar className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Chamadas Judit API - {tenant.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cards de resumo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                  <Search className="h-4 w-4" />
                  <span className="text-2xl font-bold">{summary.requestDocument}</span>
                </div>
                <p className="text-xs text-muted-foreground">Busca OAB</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                  <FileText className="h-4 w-4" />
                  <span className="text-2xl font-bold">{summary.lawsuitCnj}</span>
                </div>
                <p className="text-xs text-muted-foreground">Det. Processo</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                  <Radar className="h-4 w-4" />
                  <span className="text-2xl font-bold">{summary.tracking}</span>
                </div>
                <p className="text-xs text-muted-foreground">Tracking</p>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between px-2 py-2 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Total de Chamadas POST:</span>
              <Badge variant="secondary" className="text-base font-semibold">
                {summary.total}
              </Badge>
            </div>

            {/* Historico */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Historico Recente</h4>
              <ScrollArea className="h-48">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma chamada registrada
                  </p>
                ) : (
                  <div className="space-y-2 pr-3">
                    {logs.map(log => (
                      <div
                        key={log.id}
                        className="flex items-center gap-3 p-2 bg-card rounded border border-border text-sm"
                      >
                        <div className="text-muted-foreground">
                          {getTipoIcon(log.tipo_chamada)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getTipoLabel(log.tipo_chamada)}</span>
                            {log.sucesso ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            )}
                          </div>
                          {log.erro_mensagem && (
                            <p className="text-xs text-destructive truncate">{log.erro_mensagem}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}