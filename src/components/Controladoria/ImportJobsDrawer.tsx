import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useImportJobs } from '@/hooks/useImportLotes';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface Props {
  loteId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; tone: string }> = {
  pendente: { label: 'Pendente', icon: Clock, tone: 'text-muted-foreground' },
  buscando_processo: { label: 'Buscando processo', icon: Loader2, tone: 'text-primary' },
  buscando_andamentos: { label: 'Buscando andamentos', icon: Loader2, tone: 'text-primary' },
  aguardando_andamentos: { label: 'Aguardando retry', icon: RefreshCw, tone: 'text-[hsl(var(--chart-4))]' },
  concluido: { label: 'Concluído', icon: CheckCircle2, tone: 'text-[hsl(var(--chart-2))]' },
  duplicado: { label: 'Duplicado', icon: AlertTriangle, tone: 'text-[hsl(var(--chart-4))]' },
  falha_processo: { label: 'Falha no processo', icon: XCircle, tone: 'text-destructive' },
  falha_andamentos: { label: 'Falha nos andamentos', icon: XCircle, tone: 'text-destructive' },
};

export function ImportJobsDrawer({ loteId, open, onOpenChange }: Props) {
  const { jobs, loading } = useImportJobs(open ? loteId : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>Detalhes do lote</SheetTitle>
          <SheetDescription>
            {jobs.length} processos • atualização em tempo real
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {jobs.map((job) => {
                const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pendente;
                const Icon = cfg.icon;
                const isSpinning = job.status === 'buscando_processo' || job.status === 'buscando_andamentos';
                return (
                  <div key={job.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs truncate">{job.numero_cnj}</p>
                        <p className="text-xs text-muted-foreground">Linha {job.linha_planilha}</p>
                      </div>
                      <Badge variant="outline" className={cfg.tone}>
                        <Icon className={`w-3 h-3 mr-1 ${isSpinning ? 'animate-spin' : ''}`} />
                        {cfg.label}
                      </Badge>
                    </div>
                    {(job.tentativas_processo > 0 || job.tentativas_andamentos > 0) && (
                      <div className="text-xs text-muted-foreground flex gap-3">
                        {job.tentativas_processo > 0 && <span>Tentativas processo: {job.tentativas_processo}</span>}
                        {job.tentativas_andamentos > 0 && <span>Tentativas andamentos: {job.tentativas_andamentos}</span>}
                        {job.andamentos_inseridos != null && job.andamentos_inseridos > 0 && (
                          <span>{job.andamentos_inseridos} andamentos</span>
                        )}
                      </div>
                    )}
                    {job.erro_mensagem && (
                      <p className="text-xs text-destructive bg-destructive/5 rounded px-2 py-1">
                        {job.erro_mensagem}
                      </p>
                    )}
                  </div>
                );
              })}
              {jobs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">Nenhum job encontrado.</p>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}