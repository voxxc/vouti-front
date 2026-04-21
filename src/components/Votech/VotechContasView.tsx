import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Receipt, CreditCard, CheckCircle } from 'lucide-react';
import { useVotechContas } from '@/hooks/votech/useVotechContas';
import { VotechContaForm } from './VotechContaForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';
import { toast } from 'sonner';
import type { VotechConta } from '@/types/votech';

interface Props {
  tipo: 'pagar' | 'receber';
}

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pendente: { label: 'Pendente', bg: '#FF9F0A', color: '#FF9F0A' },
  pago: { label: 'Pago', bg: '#30D158', color: '#30D158' },
  atrasado: { label: 'Atrasado', bg: '#FF453A', color: '#FF453A' },
};

export function VotechContasView({ tipo }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VotechConta | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: contas, isLoading, create, update, remove, marcarPago } = useVotechContas({ tipo, status: statusFilter || undefined });

  const isPagar = tipo === 'pagar';
  const Icon = isPagar ? Receipt : CreditCard;
  const accent = isPagar ? '#FF453A' : '#30D158';
  const title = isPagar ? 'Contas a Pagar' : 'Contas a Receber';
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalPendente = contas?.filter(c => c.status !== 'pago').reduce((s, c) => s + Number(c.valor), 0) || 0;
  const totalPago = contas?.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0) || 0;

  const handleSave = async (data: any) => {
    try {
      if (editing) { await update.mutateAsync({ id: editing.id, ...data }); toast.success('Atualizado!'); }
      else { await create.mutateAsync(data); toast.success('Conta criada!'); }
      setFormOpen(false); setEditing(null);
    } catch { toast.error('Erro ao salvar'); }
  };

  const handlePagar = async (id: string) => {
    try { await marcarPago.mutateAsync(id); toast.success('Marcado como pago!'); }
    catch { toast.error('Erro'); }
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 md:pb-0">
      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div>
          <p className="text-[12px] text-black/50 md:hidden">Vencimentos</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-black">{title}</h2>
        </div>
        <Button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="hidden md:inline-flex h-10 px-5 rounded-full bg-black hover:bg-black/85 text-white text-[13px] font-medium border-0"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] text-black/50">Pendente / Atrasado</p>
          <p className="text-[18px] font-semibold tabular-nums mt-1 text-[#FF9F0A]">{fmt(totalPendente)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] text-black/50">Pago</p>
          <p className="text-[18px] font-semibold tabular-nums mt-1 text-[#30D158]">{fmt(totalPago)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] col-span-2 md:col-span-1">
          <p className="text-[11px] text-black/50">Filtro</p>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="mt-1 w-full h-8 rounded-lg bg-[#F5F5F7] border-0 px-2 text-[13px] text-black"
          >
            <option value="">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="pago">Pagos</option>
            <option value="atrasado">Atrasados</option>
          </select>
        </div>
      </div>

      {/* MOBILE list */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="p-12 text-center text-black/40 text-[13px]">Carregando…</div>
        ) : !contas?.length ? (
          <div className="rounded-2xl bg-white p-12 text-center text-black/30 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <Icon className="w-10 h-10 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[13px]">Nenhuma conta ainda</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            {contas.map((c, i) => {
              const sc = statusConfig[c.status] || statusConfig.pendente;
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? 'border-t border-black/[0.06]' : ''}`}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: sc.bg + '20' }}>
                    <Icon className="w-4 h-4" style={{ color: sc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-black truncate">{c.descricao}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-black/40">
                        {format(parseLocalDate(c.data_vencimento), "dd MMM", { locale: ptBR })}
                      </p>
                      <span className="text-[10px] px-1.5 py-px rounded-full font-medium" style={{ backgroundColor: sc.bg + '20', color: sc.color }}>
                        {sc.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[14px] font-semibold tabular-nums" style={{ color: accent }}>
                      {fmt(Number(c.valor))}
                    </span>
                    <div className="flex gap-1">
                      {c.status !== 'pago' && (
                        <button onClick={() => handlePagar(c.id)} className="p-1 text-black/40 hover:text-[#30D158]">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => { setEditing(c); setFormOpen(true); }} className="p-1 text-black/40 hover:text-black">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => remove.mutateAsync(c.id).then(() => toast.success('Removido!')).catch(() => toast.error('Erro'))} className="p-1 text-black/40 hover:text-[#FF453A]">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DESKTOP table */}
      <div className="hidden md:block rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-black/40">Carregando…</div>
        ) : !contas?.length ? (
          <div className="p-12 text-center text-black/30">
            <Icon className="w-12 h-12 mx-auto mb-3" strokeWidth={1.5} />
            <p>Nenhuma conta registrada</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-black/[0.06] hover:bg-transparent">
                <TableHead className="text-black/50 font-medium text-[12px]">Vencimento</TableHead>
                <TableHead className="text-black/50 font-medium text-[12px]">Descrição</TableHead>
                <TableHead className="text-black/50 font-medium text-[12px]">{isPagar ? 'Fornecedor' : 'Cliente'}</TableHead>
                <TableHead className="text-black/50 font-medium text-[12px]">Valor</TableHead>
                <TableHead className="text-black/50 font-medium text-[12px]">Status</TableHead>
                <TableHead className="text-black/50 w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map(c => {
                const sc = statusConfig[c.status] || statusConfig.pendente;
                return (
                  <TableRow key={c.id} className="border-black/[0.06]">
                    <TableCell className="text-black/70 text-[13px]">{format(parseLocalDate(c.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell className="text-black text-[13px]">{c.descricao}</TableCell>
                    <TableCell className="text-black/60 text-[13px]">{c.fornecedor_cliente || '—'}</TableCell>
                    <TableCell className="font-semibold text-[13px] tabular-nums" style={{ color: accent }}>{fmt(Number(c.valor))}</TableCell>
                    <TableCell>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: sc.bg + '20', color: sc.color }}>{sc.label}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.status !== 'pago' && (
                          <button onClick={() => handlePagar(c.id)} className="p-1.5 rounded-lg hover:bg-[#30D158]/10 text-black/50 hover:text-[#30D158]" title="Marcar como pago">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => { setEditing(c); setFormOpen(true); }} className="p-1.5 rounded-lg hover:bg-black/5 text-black/50 hover:text-black">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => remove.mutateAsync(c.id).then(() => toast.success('Removido!')).catch(() => toast.error('Erro'))} className="p-1.5 rounded-lg hover:bg-[#FF453A]/10 text-black/50 hover:text-[#FF453A]">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* FAB mobile */}
      <button
        onClick={() => { setEditing(null); setFormOpen(true); }}
        className="md:hidden fixed right-5 bottom-20 z-40 w-14 h-14 rounded-full bg-black text-white shadow-[0_10px_30px_-5px_rgba(0,0,0,0.4)] flex items-center justify-center active:scale-95 transition-transform"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Nova conta"
      >
        <Plus className="w-6 h-6" />
      </button>

      <VotechContaForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        tipo={tipo}
        conta={editing}
        onSave={handleSave}
        saving={create.isPending || update.isPending}
      />
    </div>
  );
}