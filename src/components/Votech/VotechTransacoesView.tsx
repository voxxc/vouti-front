import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useVotechTransacoes } from '@/hooks/votech/useVotechTransacoes';
import { VotechTransacaoForm } from './VotechTransacaoForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';
import { toast } from 'sonner';
import type { VotechTransacao } from '@/types/votech';

interface Props {
  tipo: 'receita' | 'despesa';
}

export function VotechTransacoesView({ tipo }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VotechTransacao | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: transacoes, isLoading, create, update, remove } = useVotechTransacoes({ tipo, status: statusFilter || undefined });

  const totalPago = transacoes?.filter(t => t.status === 'pago').reduce((s, t) => s + Number(t.valor), 0) || 0;
  const totalPendente = transacoes?.filter(t => t.status === 'pendente').reduce((s, t) => s + Number(t.valor), 0) || 0;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isReceita = tipo === 'receita';
  const Icon = isReceita ? TrendingUp : TrendingDown;
  const accent = isReceita ? '#30D158' : '#FF453A';
  const title = isReceita ? 'Receitas' : 'Despesas';

  const handleSave = async (data: any) => {
    try {
      if (editing) { await update.mutateAsync({ id: editing.id, ...data }); toast.success('Atualizado!'); }
      else { await create.mutateAsync(data); toast.success('Criado!'); }
      setFormOpen(false); setEditing(null);
    } catch { toast.error('Erro ao salvar'); }
  };

  const handleDelete = async (id: string) => {
    try { await remove.mutateAsync(id); toast.success('Removido!'); }
    catch { toast.error('Erro ao remover'); }
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div>
          <p className="text-[12px] text-black/50 md:hidden">{isReceita ? 'Entradas' : 'Saídas'}</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-black">{title}</h2>
        </div>
        <Button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="hidden md:inline-flex h-10 px-5 rounded-full bg-black hover:bg-black/85 text-white text-[13px] font-medium border-0"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nova {isReceita ? 'Receita' : 'Despesa'}
        </Button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] text-black/50">Total Pago</p>
          <p className="text-[18px] font-semibold tabular-nums mt-1" style={{ color: accent }}>{fmt(totalPago)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] text-black/50">Pendente</p>
          <p className="text-[18px] font-semibold tabular-nums mt-1 text-[#FF9F0A]">{fmt(totalPendente)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] col-span-2 md:col-span-1">
          <p className="text-[11px] text-black/50">Filtro</p>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="mt-1 w-full h-8 rounded-lg bg-[#F5F5F7] border-0 px-2 text-[13px] text-black"
          >
            <option value="">Todos</option>
            <option value="pago">Pagos</option>
            <option value="pendente">Pendentes</option>
          </select>
        </div>
      </div>

      {/* MOBILE list (iOS Settings style) */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="p-12 text-center text-black/40 text-[13px]">Carregando…</div>
        ) : !transacoes?.length ? (
          <div className="rounded-2xl bg-white p-12 text-center text-black/30 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <Icon className="w-10 h-10 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[13px]">Nenhuma {tipo} ainda</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            {transacoes.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? 'border-t border-black/[0.06]' : ''}`}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: accent + '20' }}>
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-black truncate">{t.descricao}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-black/40">{format(parseLocalDate(t.data), "dd MMM", { locale: ptBR })}</p>
                    {t.status === 'pendente' && (
                      <span className="text-[10px] px-1.5 py-px rounded-full bg-[#FF9F0A]/15 text-[#FF9F0A] font-medium">Pendente</span>
                    )}
                    {t.categoria && (
                      <span className="text-[10px] px-1.5 py-px rounded-full" style={{ backgroundColor: (t.categoria.cor || '#999') + '20', color: t.categoria.cor || '#999' }}>
                        {t.categoria.nome}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[14px] font-semibold tabular-nums" style={{ color: accent }}>
                    {isReceita ? '+' : '-'} {fmt(Number(t.valor))}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(t); setFormOpen(true); }} className="p-1 rounded text-black/40 hover:text-black">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-1 rounded text-black/40 hover:text-[#FF453A]">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DESKTOP table */}
      <div className="hidden md:block rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-black/40">Carregando…</div>
        ) : !transacoes?.length ? (
          <div className="p-12 text-center text-black/30">
            <Icon className="w-12 h-12 mx-auto mb-3" strokeWidth={1.5} />
            <p>Nenhuma {tipo} registrada</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-black/[0.06] hover:bg-transparent">
                <TableHead className="text-black/50 font-medium text-[12px]">Data</TableHead>
                <TableHead className="text-black/50 font-medium text-[12px]">Descrição</TableHead>
                <TableHead className="text-black/50 font-medium text-[12px]">Categoria</TableHead>
                <TableHead className="text-black/50 font-medium text-[12px]">Valor</TableHead>
                <TableHead className="text-black/50 font-medium text-[12px]">Status</TableHead>
                <TableHead className="text-black/50 w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoes.map(t => (
                <TableRow key={t.id} className="border-black/[0.06]">
                  <TableCell className="text-black/70 text-[13px]">{format(parseLocalDate(t.data), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell className="text-black text-[13px]">{t.descricao}</TableCell>
                  <TableCell>
                    {t.categoria ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: (t.categoria.cor || '#999') + '20', color: t.categoria.cor || '#999' }}>
                        {t.categoria.nome}
                      </span>
                    ) : <span className="text-[11px] text-black/30">—</span>}
                  </TableCell>
                  <TableCell className="font-semibold text-[13px] tabular-nums" style={{ color: accent }}>{fmt(Number(t.valor))}</TableCell>
                  <TableCell>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${t.status === 'pago' ? 'bg-[#30D158]/15 text-[#30D158]' : 'bg-[#FF9F0A]/15 text-[#FF9F0A]'}`}>
                      {t.status === 'pago' ? 'Pago' : 'Pendente'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(t); setFormOpen(true); }} className="p-1.5 rounded-lg hover:bg-black/5 text-black/50 hover:text-black">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg hover:bg-[#FF453A]/10 text-black/50 hover:text-[#FF453A]">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* FAB mobile */}
      <button
        onClick={() => { setEditing(null); setFormOpen(true); }}
        className="md:hidden fixed right-5 bottom-20 z-40 w-14 h-14 rounded-full bg-black text-white shadow-[0_10px_30px_-5px_rgba(0,0,0,0.4)] flex items-center justify-center active:scale-95 transition-transform"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Nova transação"
      >
        <Plus className="w-6 h-6" />
      </button>

      <VotechTransacaoForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        tipo={tipo}
        transacao={editing}
        onSave={handleSave}
        saving={create.isPending || update.isPending}
      />
    </div>
  );
}