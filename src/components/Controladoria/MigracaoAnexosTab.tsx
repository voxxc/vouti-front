import { useMigracaoAnexos } from '@/hooks/useMigracaoAnexos';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Paperclip, AlertTriangle, CheckCircle2, RefreshCw, KeyRound } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { RebindCredencialJuditDialog } from './RebindCredencialJuditDialog';

export const MigracaoAnexosTab = () => {
  const { stats, historico, loading, running, carregar, migrarLote } = useMigracaoAnexos();
  const [rebindOpen, setRebindOpen] = useState(false);

  const totalPendentes = stats.oabPendentes + stats.cnpjPendentes;
  const totalMigrados = stats.oabMigrados + stats.cnpjMigrados;
  const totalAtivos = stats.oabAtivos + stats.cnpjAtivos;
  const progresso = totalAtivos > 0 ? Math.round((totalMigrados / totalAtivos) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary" />
            Migração de Anexos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Recria os trackings ativos da Judit com <code className="text-xs bg-muted px-1 rounded">with_attachments: true</code> para que as próximas movimentações já tragam os arquivos disponíveis para download.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading || running}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRebindOpen(true)}>
            <KeyRound className="h-4 w-4 mr-2" />
            Recriar com credencial
          </Button>
          <Button onClick={() => migrarLote(10)} disabled={running || totalPendentes === 0}>
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Migrando...
              </>
            ) : (
              `Migrar próximo lote (10)`
            )}
          </Button>
        </div>
      </div>

      <RebindCredencialJuditDialog open={rebindOpen} onOpenChange={setRebindOpen} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Trackings ativos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{totalAtivos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Migrados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-[hsl(var(--chart-2))]">{totalMigrados}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pendentes</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-500">{totalPendentes}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Erros recentes</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">{stats.errosRecentes}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Progresso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>OAB: {stats.oabMigrados}/{stats.oabAtivos}</span>
            <span>CNPJ: {stats.cnpjMigrados}/{stats.cnpjAtivos}</span>
            <span>{progresso}%</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Últimas execuções</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historico.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhuma execução registrada ainda.
            </div>
          ) : (
            <ScrollArea className="h-[360px]">
              <div className="divide-y">
                {historico.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 px-4 py-3">
                    {h.status === 'migrado' ? (
                      <CheckCircle2 className="h-4 w-4 text-[hsl(var(--chart-2))] mt-0.5 shrink-0" />
                    ) : h.status === 'erro' ? (
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    ) : (
                      <Loader2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] uppercase">{h.tipo}</Badge>
                        <Badge
                          variant={h.status === 'erro' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {h.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(h.executado_em).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {h.tracking_id_novo && (
                        <p className="text-xs font-mono mt-1 truncate">
                          novo: {h.tracking_id_novo}
                        </p>
                      )}
                      {h.erro && (
                        <p className="text-xs text-destructive mt-1 break-all">{h.erro}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MigracaoAnexosTab;