import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileStack, ChevronRight } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PushDoc, PushDocProcesso } from '@/hooks/useTenantPushDocs';

interface PushDocProcessosSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pushDoc: PushDoc | null;
  processos: PushDocProcesso[];
  onMarcarLido?: (id: string) => void;
  onAbrirProcesso?: (numeroCnj: string) => void;
}

const getStatusDot = (status: string | null) => {
  const s = (status || '').toLowerCase();
  if (s.includes('arquiv')) return 'bg-muted-foreground/40';
  if (s.includes('concl') || s.includes('pend') || s.includes('despach')) return 'bg-amber-500';
  if (s) return 'bg-primary';
  return 'bg-muted-foreground/30';
};

export function PushDocProcessosSheet({
  open,
  onOpenChange,
  pushDoc,
  processos,
  onMarcarLido,
  onAbrirProcesso,
}: PushDocProcessosSheetProps) {
  const lista = pushDoc
    ? processos.filter((p) => p.push_doc_id === pushDoc.id)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Processos Encontrados</span>
            <Badge variant="secondary" className="text-[11px] font-bold">
              {lista.length}
            </Badge>
          </SheetTitle>
          {pushDoc?.descricao && (
            <p className="text-xs text-muted-foreground text-left">
              {pushDoc.descricao}
            </p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          {lista.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-muted-foreground">
              <FileStack className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm font-medium">Aguardando primeira sincronização</p>
              <p className="text-xs mt-1">
                Os processos retornados pelo Push-docs aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {lista.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (!p.lido) onMarcarLido?.(p.id);
                    onAbrirProcesso?.(p.numero_cnj);
                  }}
                  className="w-full text-left px-5 py-4 hover:bg-accent/40 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[13px] font-medium text-primary truncate">
                      {p.numero_cnj}
                    </span>
                    {!p.lido && (
                      <span className="shrink-0 w-2 h-2 rounded-full bg-primary" aria-label="Novo" />
                    )}
                  </div>
                  <div className="flex justify-between items-center mb-2 text-[11px] text-muted-foreground">
                    <span className="uppercase tracking-wider font-semibold">
                      {p.tribunal_sigla || p.tribunal || '—'}
                    </span>
                    <span>
                      {format(new Date(p.created_at), 'dd/MM/yy', { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDot(p.status_processual)}`} />
                      <span className="text-xs text-foreground/80 truncate">
                        {p.status_processual || 'Sem status'}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}