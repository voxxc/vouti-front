import { useState, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { parseExcelFile, downloadModeloExcel, LinhaPlanilha } from '@/utils/parseProcessoExcel';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oabId: string;
  oabLabel: string;
  onSuccess?: () => void;
}

type Resultado = LinhaPlanilha & {
  cnjFormatado: string | null;
  status: 'valido' | 'invalido' | 'duplicado' | 'duplicado_planilha';
  motivo?: string;
  selecionado?: boolean;
};

type Filtro = 'todos' | 'validos' | 'duplicados' | 'invalidos';

export function ImportarPlanilhaWizard({ open, onOpenChange, oabId, oabLabel, onSuccess }: Props) {
  const { tenantId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [validando, setValidando] = useState(false);
  const [criandoLote, setCriandoLote] = useState(false);
  const [resultado, setResultado] = useState<Resultado[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const reset = () => {
    setStep(1);
    setFile(null);
    setResultado([]);
    setFiltro('todos');
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFileSelect = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 5MB.', variant: 'destructive' });
      return;
    }
    setFile(f);
    setParsing(true);
    try {
      const linhas = await parseExcelFile(f);
      if (linhas.length === 0) {
        toast({ title: 'Planilha vazia', description: 'Nenhuma linha com CNJ encontrada.', variant: 'destructive' });
        setFile(null);
        return;
      }
      if (linhas.length > 500) {
        toast({ title: 'Limite excedido', description: 'Máximo 500 processos por upload.', variant: 'destructive' });
        setFile(null);
        return;
      }
      // Validar no servidor
      setValidando(true);
      const { data, error } = await supabase.functions.invoke('processo-import-validar-planilha', {
        body: { tenantId, oabId, linhas },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao validar');

      const res: Resultado[] = (data.resultado || []).map((r: any) => ({
        ...r,
        selecionado: r.status === 'valido',
      }));
      setResultado(res);
      setStep(2);
    } catch (err: any) {
      toast({ title: 'Erro ao ler arquivo', description: err.message, variant: 'destructive' });
      setFile(null);
    } finally {
      setParsing(false);
      setValidando(false);
    }
  };

  const totals = useMemo(() => {
    const validos = resultado.filter((r) => r.status === 'valido').length;
    const duplicados = resultado.filter((r) => r.status === 'duplicado' || r.status === 'duplicado_planilha').length;
    const invalidos = resultado.filter((r) => r.status === 'invalido').length;
    const selecionados = resultado.filter((r) => r.selecionado && r.status === 'valido').length;
    return { validos, duplicados, invalidos, selecionados, total: resultado.length };
  }, [resultado]);

  const filtrados = useMemo(() => {
    if (filtro === 'todos') return resultado;
    if (filtro === 'validos') return resultado.filter((r) => r.status === 'valido');
    if (filtro === 'duplicados') return resultado.filter((r) => r.status === 'duplicado' || r.status === 'duplicado_planilha');
    return resultado.filter((r) => r.status === 'invalido');
  }, [resultado, filtro]);

  const toggleSelect = (idx: number) => {
    setResultado((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, selecionado: !r.selecionado } : r))
    );
  };

  const toggleAll = (checked: boolean) => {
    setResultado((prev) =>
      prev.map((r) => (r.status === 'valido' ? { ...r, selecionado: checked } : r))
    );
  };

  const handleConfirmar = async () => {
    const jobs = resultado
      .filter((r) => r.selecionado && r.status === 'valido' && r.cnjFormatado)
      .map((r) => ({
        linha: r.linha,
        cnj: r.cnjFormatado!,
      }));

    if (jobs.length === 0) {
      toast({ title: 'Nenhum processo selecionado', variant: 'destructive' });
      return;
    }

    setCriandoLote(true);
    try {
      const { data, error } = await supabase.functions.invoke('processo-import-criar-lote', {
        body: { tenantId, oabId, nomeArquivo: file?.name, jobs },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao criar lote');

      toast({
        title: 'Importação iniciada!',
        description: `${jobs.length} processos enviados para a fila. Acompanhe na aba "Importações".`,
      });
      onSuccess?.();
      handleClose(false);
    } catch (err: any) {
      toast({ title: 'Erro ao criar lote', description: err.message, variant: 'destructive' });
    } finally {
      setCriandoLote(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar planilha de processos — {oabLabel}
          </DialogTitle>
          <DialogDescription>
            Passo {step} de 3 • {step === 1 ? 'Selecione o arquivo' : step === 2 ? 'Revise e selecione os processos' : 'Confirme'}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 px-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-[400px]">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6 flex-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing || validando}
                className="border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-accent/50 rounded-xl p-12 w-full max-w-md text-center transition-colors disabled:opacity-50"
              >
                {parsing || validando ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {parsing ? 'Lendo arquivo...' : 'Validando CNJs...'}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium">Clique para selecionar uma planilha</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      .xlsx, .xls ou .csv • até 5MB / 500 linhas
                    </p>
                  </>
                )}
              </button>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                  e.target.value = '';
                }}
              />
              <Button variant="outline" onClick={downloadModeloExcel}>
                <Download className="w-4 h-4 mr-2" />
                Baixar modelo Excel
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col flex-1 min-h-0 gap-3">
              {/* Resumo */}
              <div className="grid grid-cols-4 gap-2">
                <SummaryCard label="Total" value={totals.total} tone="muted" />
                <SummaryCard label="Válidos" value={totals.validos} tone="success" />
                <SummaryCard label="Duplicados" value={totals.duplicados} tone="warning" />
                <SummaryCard label="Inválidos" value={totals.invalidos} tone="error" />
              </div>

              {/* Filtros */}
              <div className="flex items-center gap-2 flex-wrap">
                {(['todos', 'validos', 'duplicados', 'invalidos'] as Filtro[]).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filtro === f ? 'default' : 'outline'}
                    onClick={() => setFiltro(f)}
                  >
                    {f === 'todos' ? 'Todos' : f === 'validos' ? 'Válidos' : f === 'duplicados' ? 'Duplicados' : 'Inválidos'}
                  </Button>
                ))}
                <div className="flex-1" />
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id="select-all"
                    checked={totals.selecionados === totals.validos && totals.validos > 0}
                    onCheckedChange={(v) => toggleAll(!!v)}
                  />
                  <label htmlFor="select-all" className="cursor-pointer">
                    Selecionar todos os válidos
                  </label>
                </div>
              </div>

              {/* Tabela */}
              <ScrollArea className="flex-1 border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 w-10"></th>
                      <th className="p-2 text-left w-12">#</th>
                      <th className="p-2 text-left">CNJ</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Cliente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((r) => {
                      const idx = resultado.indexOf(r);
                      return (
                        <tr key={idx} className="border-t hover:bg-accent/30">
                          <td className="p-2">
                            {r.status === 'valido' && (
                              <Checkbox
                                checked={!!r.selecionado}
                                onCheckedChange={() => toggleSelect(idx)}
                              />
                            )}
                          </td>
                          <td className="p-2 text-muted-foreground">{r.linha}</td>
                          <td className="p-2 font-mono text-xs">{r.cnjFormatado || r.cnj}</td>
                          <td className="p-2">
                            <StatusBadge status={r.status} motivo={r.motivo} />
                          </td>
                          <td className="p-2 text-muted-foreground truncate max-w-[200px]">
                            {r.cliente || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 flex-1">
              <CheckCircle2 className="w-16 h-16 text-primary" />
              <h3 className="text-lg font-semibold">Pronto para importar</h3>
              <p className="text-muted-foreground text-center max-w-md">
                <strong>{totals.selecionados} processos</strong> serão enviados para a fila de processamento.
                A busca de andamentos rodará em segundo plano com retry automático.
              </p>
              <p className="text-xs text-muted-foreground">
                Você pode fechar esta janela — o sistema continua processando.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : s))}
            disabled={step === 1 || criandoLote}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>

          {step === 2 && (
            <Button
              onClick={() => setStep(3)}
              disabled={totals.selecionados === 0}
            >
              Próximo ({totals.selecionados} selecionados) <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}

          {step === 3 && (
            <Button onClick={handleConfirmar} disabled={criandoLote}>
              {criandoLote ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...
                </>
              ) : (
                <>Importar {totals.selecionados} processos</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'muted' | 'success' | 'warning' | 'error' }) {
  const colors = {
    muted: 'bg-muted text-foreground',
    success: 'bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))]',
    warning: 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]',
    error: 'bg-destructive/10 text-destructive',
  };
  return (
    <div className={`rounded-lg p-3 ${colors[tone]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status, motivo }: { status: string; motivo?: string }) {
  if (status === 'valido') {
    return (
      <Badge variant="outline" className="text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2))]/50">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Válido
      </Badge>
    );
  }
  if (status === 'duplicado' || status === 'duplicado_planilha') {
    return (
      <Badge variant="outline" className="text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/50" title={motivo}>
        <AlertTriangle className="w-3 h-3 mr-1" /> {status === 'duplicado' ? 'Já cadastrado' : 'Repetido'}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-destructive border-destructive/50" title={motivo}>
      <XCircle className="w-3 h-3 mr-1" /> Inválido
    </Badge>
  );
}