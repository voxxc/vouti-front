import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const title = isReceita ? 'Receitas' : 'Despesas';

  const handleSave = async (data: any) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...data });
        toast.success('Atualizado com sucesso!');
      } else {
        await create.mutateAsync(data);
        toast.success('Criado com sucesso!');
      }
      setFormOpen(false);
      setEditing(null);
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success('Removido!');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${isReceita ? 'text-emerald-400' : 'text-rose-400'}`} />
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Nova {isReceita ? 'Receita' : 'Despesa'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-400">Total Pago</p>
            <p className={`text-xl font-bold ${isReceita ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(totalPago)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-400">Total Pendente</p>
            <p className="text-xl font-bold text-amber-400">{fmt(totalPendente)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-400">Filtro</p>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="mt-1 w-full h-8 rounded border border-slate-700 bg-slate-800 px-2 text-sm text-white">
              <option value="">Todos</option>
              <option value="pago">Pagos</option>
              <option value="pendente">Pendentes</option>
            </select>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Carregando...</div>
          ) : !transacoes?.length ? (
            <div className="p-12 text-center text-slate-500">
              <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma {tipo} registrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Data</TableHead>
                  <TableHead className="text-slate-400">Descrição</TableHead>
                  <TableHead className="text-slate-400">Categoria</TableHead>
                  <TableHead className="text-slate-400">Valor</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400 w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transacoes.map(t => (
                  <TableRow key={t.id} className="border-slate-800">
                    <TableCell className="text-slate-300 text-sm">{format(parseLocalDate(t.data), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell className="text-white text-sm">{t.descricao}</TableCell>
                    <TableCell>
                      {t.categoria ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: (t.categoria.cor || '#6366f1') + '20', color: t.categoria.cor || '#6366f1' }}>
                          {t.categoria.nome}
                        </span>
                      ) : <span className="text-xs text-slate-500">—</span>}
                    </TableCell>
                    <TableCell className={`font-semibold text-sm ${isReceita ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(Number(t.valor))}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'pago' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {t.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(t); setFormOpen(true); }} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
