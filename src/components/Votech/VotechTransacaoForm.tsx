import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useVotechCategorias } from '@/hooks/votech/useVotechCategorias';
import type { VotechTransacao } from '@/types/votech';

interface Props {
  open: boolean;
  onClose: () => void;
  tipo: 'receita' | 'despesa';
  transacao?: VotechTransacao | null;
  onSave: (data: any) => void;
  saving?: boolean;
}

export function VotechTransacaoForm({ open, onClose, tipo, transacao, onSave, saving }: Props) {
  const { data: categorias } = useVotechCategorias(tipo);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState<number>(0);
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [categoriaId, setCategoriaId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [status, setStatus] = useState<'pago' | 'pendente'>('pago');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (transacao) {
      setDescricao(transacao.descricao);
      setValor(Number(transacao.valor));
      setData(transacao.data);
      setCategoriaId(transacao.categoria_id || '');
      setFormaPagamento(transacao.forma_pagamento || '');
      setStatus(transacao.status);
      setObservacoes(transacao.observacoes || '');
    } else {
      setDescricao('');
      setValor(0);
      setData(new Date().toISOString().split('T')[0]);
      setCategoriaId('');
      setFormaPagamento('');
      setStatus('pago');
      setObservacoes('');
    }
  }, [transacao, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      tipo,
      descricao,
      valor,
      data,
      categoria_id: categoriaId || null,
      forma_pagamento: formaPagamento || null,
      status,
      observacoes: observacoes || null,
      recorrente: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{transacao ? 'Editar' : 'Nova'} {tipo === 'receita' ? 'Receita' : 'Despesa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-slate-300">Descrição</Label>
            <Input value={descricao} onChange={e => setDescricao(e.target.value)} required className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300">Valor</Label>
              <CurrencyInput value={valor} onChange={setValor} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-300">Data</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300">Categoria</Label>
              <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white">
                <option value="">Sem categoria</option>
                {categorias?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-slate-300">Status</Label>
              <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white">
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-slate-300">Forma de Pagamento</Label>
            <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white">
              <option value="">—</option>
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="transferencia">Transferência</option>
              <option value="boleto">Boleto</option>
            </select>
          </div>
          <div>
            <Label className="text-slate-300">Observações</Label>
            <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400">Cancelar</Button>
            <Button type="submit" disabled={saving || !descricao || valor <= 0} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
