import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useImportLotes, ImportLote } from '@/hooks/useImportLotes';
import { ImportJobsDrawer } from './ImportJobsDrawer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  RotateCw,
} from 'lucide-react';

function fmtData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function ImportacoesTab() {
  const { lotes, loading } = useImportLotes();
  const [selectedLote, setSelectedLote] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reprocessando, setReprocessando] = useState<string | null>(null);

  const openDrawer = (id: string) => {
    setSelectedLote(id);
    setDrawerOpen(true);
  };

  const handleReprocessar = async (loteId: string) => {
    setReprocessando(loteId);
    try {
      const { data, error } = await supabase.functions.invoke('processo-import-reprocessar', {
        body: { loteId },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Erro');
      toast({
        title: 'Reprocessamento iniciado',
        description: `${data.reprocessed || 0} jobs voltaram para a fila.`,
      });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setReprocessando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (lotes.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">Nenhuma importação ainda</h3>
        <p className="text-muted-foreground text-sm">
          Use o botão "Importar planilha" em uma OAB para começar.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {lotes.map((lote) => (
          <LoteCard
            key={lote.id}
            lote={lote}
            onVerDetalhes={() => openDrawer(lote.id)}
            onReprocessar={() => handleReprocessar(lote.id)}
            reprocessando={reprocessando === lote.id}
          />
        ))}
      </div>

      <ImportJobsDrawer loteId={selectedLote} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}

function LoteCard({
  lote,
  onVerDetalhes,
  onReprocessar,
  reprocessando,
}: {
  lote: ImportLote;
  onVerDetalhes: () => void;
  onReprocessar: () => void;
  reprocessando: boolean;
}) {
  const total = lote.total_linhas || 1;
  const concluidos = lote.total_concluidos || 0;
  const duplicados = lote.total_duplicados || 0;
  const falhas = lote.total_falhas || 0;
  const pendentes = lote.total_pendentes || 0;
  const processados = concluidos + duplicados + falhas;
  const pct = Math.round((processados / total) * 100);

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileSpreadsheet className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="font-medium truncate">{lote.nome_arquivo || 'Importação'}</p>
            <StatusLote status={lote.status} pendentes={pendentes} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{fmtData(lote.created_at)}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button size="sm" variant="ghost" onClick={onVerDetalhes}>
            <Eye className="w-4 h-4 mr-1" />
            Detalhes
          </Button>
          {falhas > 0 && (
            <Button size="sm" variant="outline" onClick={onReprocessar} disabled={reprocessando}>
              {reprocessando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RotateCw className="w-4 h-4 mr-1" /> Reprocessar
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{processados} / {total} processados</span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} />
      </div>

      <div className="flex items-center gap-3 text-xs flex-wrap">
        <Stat icon={CheckCircle2} value={concluidos} label="concluídos" tone="text-[hsl(var(--chart-2))]" />
        <Stat icon={AlertTriangle} value={duplicados} label="duplicados" tone="text-[hsl(var(--chart-4))]" />
        <Stat icon={XCircle} value={falhas} label="falhas" tone="text-destructive" />
        <Stat icon={Clock} value={pendentes} label="na fila" tone="text-muted-foreground" />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label, tone }: any) {
  return (
    <div className={`flex items-center gap-1 ${tone}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="font-medium">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function StatusLote({ status, pendentes }: { status: string; pendentes: number }) {
  if (status === 'concluido') {
    return <Badge variant="outline" className="text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2))]/50">Concluído</Badge>;
  }
  if (status === 'cancelado') {
    return <Badge variant="outline" className="text-destructive border-destructive/50">Cancelado</Badge>;
  }
  if (pendentes > 0) {
    return (
      <Badge variant="outline" className="text-primary border-primary/50">
        <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Em andamento
      </Badge>
    );
  }
  return <Badge variant="outline">Em andamento</Badge>;
}