import { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, Plus, Bell, BellOff, Paperclip, Calendar, Building2, Scale,
  ExternalLink, FileText, RefreshCw, Trash2, Lock, LockOpen, GripVertical, EyeOff, Pencil,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdicionarMovimentoManualDialog } from './AdicionarMovimentoManualDialog';
import { TribunalTag } from './GerenciarTribunaisDialog';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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
  const [destravado, setDestravado] = useState(false);
  const [ordemDirty, setOrdemDirty] = useState(false);
  const [salvandoOrdem, setSalvandoOrdem] = useState(false);
  const [tribunais, setTribunais] = useState<TribunalTag[]>([]);
  const [andamentos, setAndamentos] = useState<any[]>([]);

  const tribunaisMap = useMemo(() => {
    const m: Record<string, TribunalTag> = {};
    tribunais.forEach((t) => { m[t.slug] = t; });
    return m;
  }, [tribunais]);

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
      setAndamentos(((resp as any)?.andamentos || []) as any[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao carregar detalhes do processo');
    } finally {
      setLoading(false);
    }
  };

  const carregarTribunais = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('super-admin-listar-tribunais-andamento', { body: {} });
      if (error) throw error;
      setTribunais(((data as any)?.tribunais || []) as TribunalTag[]);
    } catch (e) { console.warn(e); }
  };

  useEffect(() => {
    if (!open) return;
    setData(null);
    setDestravado(false);
    carregar();
    carregarTribunais();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, processo.id]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = andamentos.findIndex((a) => a.id === active.id);
    const newIndex = andamentos.findIndex((a) => a.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const novo = arrayMove(andamentos, oldIndex, newIndex);
    setAndamentos(novo);
    setOrdemDirty(true);
  };

  const salvarOrdem = async () => {
    if (!ordemDirty) {
      setDestravado(false);
      return;
    }
    setSalvandoOrdem(true);
    try {
      const { error } = await supabase.functions.invoke('super-admin-reordenar-andamentos', {
        body: { processo_oab_id: processo.id, ordem: andamentos.map((a) => a.id) },
      });
      if (error) throw error;
      toast.success('Ordem salva.');
      setOrdemDirty(false);
      setDestravado(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar ordem');
    } finally {
      setSalvandoOrdem(false);
    }
  };

  const excluirAndamento = async (id: string) => {
    if (!confirm('Excluir este movimento? Esta ação não pode ser desfeita.')) return;
    try {
      const { data, error } = await supabase.functions.invoke('super-admin-deletar-andamento', { body: { andamento_id: id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).detail || (data as any).error);
      toast.success('Movimento excluído.');
      setAndamentos((prev) => prev.filter((a) => a.id !== id));
      onAndamentoCriado?.();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir');
    }
  };

  const atualizarMeta = async (id: string, patch: { sigiloso?: boolean; tribunal_tag?: string | null }) => {
    try {
      const { data, error } = await supabase.functions.invoke('super-admin-atualizar-andamento', {
        body: { andamento_id: id, ...patch },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).detail || (data as any).error);
      setAndamentos((prev) => prev.map((a) => {
        if (a.id !== id) return a;
        const dc = { ...(a.dados_completos || {}) };
        if (patch.sigiloso !== undefined) dc.sigiloso = patch.sigiloso;
        if (patch.tribunal_tag !== undefined) dc.tribunal_tag = patch.tribunal_tag;
        return { ...a, dados_completos: dc };
      }));
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar');
    }
  };

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
                    Andamentos ({andamentos.length})
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={destravado ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setDestravado((v) => !v)}
                      title={destravado ? 'Travar ordem' : 'Destravar para reordenar'}
                    >
                      {destravado ? <LockOpen className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                      {destravado ? 'Reordenando' : 'Reordenar'}
                    </Button>
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
                {andamentos.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    Nenhum andamento cadastrado.
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={andamentos.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-3">
                        {andamentos.map((a) => (
                          <AndamentoCard
                            key={a.id}
                            andamento={a}
                            destravado={destravado}
                            tribunaisMap={tribunaisMap}
                            tribunais={tribunais}
                            onExcluir={() => excluirAndamento(a.id)}
                            onAtualizar={(patch) => atualizarMeta(a.id, patch)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
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

interface AndamentoCardProps {
  andamento: any;
  destravado: boolean;
  tribunaisMap: Record<string, TribunalTag>;
  tribunais: TribunalTag[];
  onExcluir: () => void;
  onAtualizar: (patch: { sigiloso?: boolean; tribunal_tag?: string | null }) => void;
}

function AndamentoCard({ andamento: a, destravado, tribunaisMap, tribunais, onExcluir, onAtualizar }: AndamentoCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: a.id, disabled: !destravado });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const dc = (a.dados_completos || {}) as any;
  const isManual = dc?.origem === 'manual';
  const anexo = dc?.anexo;
  const sigiloso = !!dc?.sigiloso;
  const tag: string | null = dc?.tribunal_tag || null;
  const tagInfo = tag ? tribunaisMap[tag] : null;

  return (
    <Card ref={setNodeRef} style={style} className="p-3">
      <div className="flex items-start gap-2">
        {destravado && (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-1"
            {...attributes}
            {...listeners}
            title="Arrastar para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-muted-foreground">
              {formatDataCurta(a.data_movimentacao)}
            </span>
            {a.tipo_movimentacao && (
              <Badge variant="outline" className="text-xs">{a.tipo_movimentacao}</Badge>
            )}
            {isManual && <Badge variant="secondary" className="text-xs">Manual</Badge>}
            {!a.lida && <Badge variant="default" className="text-xs">Não lida</Badge>}
            {sigiloso && (
              <Badge variant="destructive" className="text-xs inline-flex items-center gap-1">
                <EyeOff className="h-3 w-3" /> Sigiloso
              </Badge>
            )}
            {tag && (
              <Badge
                variant="outline"
                className="text-xs"
                style={tagInfo?.cor ? { borderColor: tagInfo.cor, color: tagInfo.cor } : undefined}
              >
                {tagInfo?.nome || tag}
              </Badge>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{a.descricao}</p>
          {anexo && (
            <div className="mt-2 flex items-center gap-1 text-xs text-primary">
              <Paperclip className="h-3 w-3" />
              <span className="truncate">{anexo.nome}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar metadados">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`sig-${a.id}`}
                    checked={sigiloso}
                    onCheckedChange={(v) => onAtualizar({ sigiloso: v === true })}
                  />
                  <Label htmlFor={`sig-${a.id}`} className="text-sm font-normal cursor-pointer flex items-center gap-1">
                    <EyeOff className="h-3.5 w-3.5" /> Sigiloso
                  </Label>
                </div>
                <div>
                  <Label className="text-xs">Tribunal</Label>
                  <select
                    value={tag ?? ''}
                    onChange={(e) => onAtualizar({ tribunal_tag: e.target.value || null })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">Sem tribunal</option>
                    {tribunais.map((t) => (
                      <option key={t.id} value={t.slug}>{t.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={onExcluir}
            title="Excluir movimento"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}