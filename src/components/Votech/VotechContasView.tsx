import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

const statusConfig: Record<string, { label: string; class: string }> = {
  pendente: { label: 'Pendente', class: 'bg-amber-500/20 text-amber-400' },
  pago: { label: 'Pago', class: 'bg-emerald-500/20 text-emerald-400' },
  atrasado: { label: 'Atrasado', class: 'bg-rose-500/20 text-rose-400' },
};

export function VotechContasView({ tipo }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VotechConta | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: contas, isLoading, create, update, remove, marcarPago } = useVotechContas({ tipo, status: statusFilter || undefined });

  const isPagar = tipo === 'pagar';
  const Icon = isPagar ? Receipt : CreditCard;
  const title = isPagar ? 'Contas a Pagar' : 'Contas a Receber';
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalPendente = contas?.filter(c => c.status !== 'pago').reduce((s, c) => s + Number(c.valor), 0) || 0;
  const totalPago = contas?.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0) || 0;

  const handleSave = async (data: any) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...data });
        toast.success('Atualizado!');
      } else {
        await create.mutateAsync(data);
        toast.success('Conta criada!');
      }
      setFormOpen(false);
      setEditing(null);
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const handlePagar = async (id: string) => {
    try {
      await marcarPago.mutateAsync(id);
      toast.success('Marcado como pago!');
    } catch {
      toast.error('Erro');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${isPagar ? 'text-rose-400' : 'text-emerald-400'}`} />
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-400">Pendente / Atrasado</p>
            <p className="text-xl font-bold text-amber-400">{fmt(totalPendente)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-400">Pago</p>
            <p className="text-xl font-bold text-emerald-400">{fmt(totalPago)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-400">Filtro</p>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="mt-1 w-full h-8 rounded border border-slate-700 bg-slate-800 px-2 text-sm text-white">
              <option value="">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="pago">Pagos</option>
              <option value="atrasado">Atrasados</option>
            </select>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Carregando...</div>
          ) : !contas?.length ? (
            <div className="p-12 text-center text-slate-500">
              <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma conta registrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Vencimento</TableHead>
                  <TableHead className="text-slate-400">Descrição</TableHead>
                  <TableHead className="text-slate-400">{isPagar ? 'Fornecedor' : 'Cliente'}</TableHead>
                  <TableHead className="text-slate-400">Valor</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400 w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.map(c => {
                  const sc = statusConfig[c.status] || statusConfig.pendente;
                  return (
                    <TableRow key={c.id} className="border-slate-800">
                      <TableCell className="text-slate-300 text-sm">{format(parseLocalDate(c.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell className="text-white text-sm">{c.descricao}</TableCell>
                      <TableCell className="text-slate-400 text-sm">{c.fornecedor_cliente || '—'}</TableCell>
                      <TableCell className={`font-semibold text-sm ${isPagar ? 'text-rose-400' : 'text-emerald-400'}`}>{fmt(Number(c.valor))}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${sc.class}`}>{sc.label}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {c.status !== 'pago' && (
                            <button onClick={() => handlePagar(c.id)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400" title="Marcar como pago">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => { setEditing(c); setFormOpen(true); }} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => remove.mutateAsync(c.id).then(() => toast.success('Removido!')).catch(() => toast.error('Erro'))} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400">
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
        </CardContent>
      </Card>

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
