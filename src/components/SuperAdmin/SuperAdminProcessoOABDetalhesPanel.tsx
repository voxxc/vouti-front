import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, Plus, Bell, BellOff, Paperclip, Calendar, Building2, Scale,
  ExternalLink, FileText, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdicionarMovimentoManualDialog } from './AdicionarMovimentoManualDialog';

interface ProcessoLite {
  id: string;
  numero_cnj: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processo: ProcessoLite;
  tenantNome: string;
  onAndamentoCriado?: () => void;
}

interface DetalhesResponse {
  processo: any;
  andamentos: any[];
  anexos: any[];
  monitoramento_escavador: any | null;
}

function formatData(value?: string | null) {
  if (!value) return '—';
  try {
    return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
}

function formatDataCurta(value?: string | null) {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return value;
  }
}

export function SuperAdminProcessoOABDetalhesPanel({
  open, onOpenChange, processo, tenantNome, onAndamentoCriado,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DetalhesResponse | null>(null);
  const [adicionarOpen, setAdicionarOpen] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke(
        'super-admin-processo-oab-detalhes',
        { body: { processo_oab_id: processo.id } },
      );
      if (error) throw error;
      if ((resp as any)?.error) throw new Error((resp as any).error);
      setData(resp as DetalhesResponse);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao carregar detalhes do processo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setData(null);
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, processo.id]);

  const proc = data?.processo;
  const monitoramentoAtivo = !!proc?.monitoramento_ativo;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
          <SheetHeader className="p-6 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-mono text-sm">{processo.numero_cnj}</span>
              {proc?.tribunal_sigla && (
                <Badge variant="outline" className="text-xs">{proc.tribunal_sigla}</Badge>
              )}
            </SheetTitle>
            <div className="text-xs text-muted-foreground">{tenantNome}</div>
          </SheetHeader>

          {loading || !data ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-5">
                {/* Cabeçalho do processo */}
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Parte ativa</div>
                      <div>{proc.parte_ativa || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Parte passiva</div>
                      <div>{proc.parte_passiva || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Tribunal
                      </div>
                      <div>{proc.tribunal || proc.tribunal_sigla || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Scale className="h-3 w-3" /> Juízo
                      </div>
                      <div>{proc.juizo || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Distribuição
                      </div>
                      <div>{formatDataCurta(proc.data_distribuicao)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div>{proc.status_processual || proc.fase_processual || '—'}</div>
                    </div>
                  </div>
                  {proc.link_tribunal && (
                    <a
                      href={proc.link_tribunal}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Abrir no tribunal
                    </a>
                  )}
                </Card>

                {/* Monitoramento */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {monitoramentoAtivo ? (
                        <Bell className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      Monitoramento
                    </div>
                    <Badge variant={monitoramentoAtivo ? 'default' : 'secondary'}>
                      {monitoramentoAtivo ? 'Ativo' : 'Pausado'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Provider</div>
                      <div>{proc.api_provider || '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Última atualização</div>
                      <div>{formatData(proc.ultima_atualizacao_detalhes)}</div>
                    </div>
                    {data.monitoramento_escavador && (
                      <>
                        <div>
                          <div className="text-muted-foreground">Frequência (Escavador)</div>
                          <div>{data.monitoramento_escavador.frequencia || '—'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Última consulta</div>
                          <div>{formatData(data.monitoramento_escavador.ultima_consulta)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Total atualizações</div>
                          <div>{data.monitoramento_escavador.total_atualizacoes ?? 0}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Monitoramento ID</div>
                          <div className="font-mono break-all">
                            {data.monitoramento_escavador.monitoramento_id || '—'}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </Card>

                {/* Adicionar movimento */}
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    Andamentos ({data.andamentos.length})
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={carregar}>
                      <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
                    </Button>
                    <Button size="sm" onClick={() => setAdicionarOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar movimento
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Lista de andamentos */}
                {data.andamentos.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    Nenhum andamento cadastrado.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.andamentos.map((a) => {
                      const dc = (a.dados_completos || {}) as any;
                      const isManual = dc?.origem === 'manual';
                      const anexo = dc?.anexo;
                      return (
                        <Card key={a.id} className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {formatDataCurta(a.data_movimentacao)}
                                </span>
                                {a.tipo_movimentacao && (
                                  <Badge variant="outline" className="text-xs">
                                    {a.tipo_movimentacao}
                                  </Badge>
                                )}
                                {isManual && (
                                  <Badge variant="secondary" className="text-xs">Manual</Badge>
                                )}
                                {!a.lida && (
                                  <Badge variant="default" className="text-xs">Não lida</Badge>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {a.descricao}
                              </p>
                              {anexo && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                                  <Paperclip className="h-3 w-3" />
                                  <span className="truncate">{anexo.nome}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {data.anexos.length > 0 && (
                  <>
                    <Separator />
                    <div className="text-sm font-medium">
                      Anexos do processo ({data.anexos.length})
                    </div>
                    <div className="space-y-1">
                      {data.anexos.map((ax) => (
                        <div
                          key={ax.id}
                          className="flex items-center gap-2 text-xs text-muted-foreground border border-border/60 rounded p-2"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span className="flex-1 truncate">{ax.attachment_name || ax.attachment_id}</span>
                          {ax.extension && <Badge variant="outline" className="text-xs">{ax.extension}</Badge>}
                          {ax.status && <Badge variant="secondary" className="text-xs">{ax.status}</Badge>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      <AdicionarMovimentoManualDialog
        open={adicionarOpen}
        onOpenChange={setAdicionarOpen}
        processo={processo}
        tenantNome={tenantNome}
        onSuccess={() => {
          setAdicionarOpen(false);
          carregar();
          onAndamentoCriado?.();
        }}
      />
    </>
  );
}