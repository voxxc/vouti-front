import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { VotechConta } from '@/types/votech';

interface Props {
  open: boolean;
  onClose: () => void;
  tipo: 'pagar' | 'receber';
  conta?: VotechConta | null;
  onSave: (data: any) => void;
  saving?: boolean;
}

export function VotechContaForm({ open, onClose, tipo, conta, onSave, saving }: Props) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState<number>(0);
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [fornecedorCliente, setFornecedorCliente] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (conta) {
      setDescricao(conta.descricao);
      setValor(Number(conta.valor));
      setDataVencimento(conta.data_vencimento);
      setFornecedorCliente(conta.fornecedor_cliente || '');
      setFormaPagamento(conta.forma_pagamento || '');
      setObservacoes(conta.observacoes || '');
    } else {
      setDescricao('');
      setValor(0);
      setDataVencimento(new Date().toISOString().split('T')[0]);
      setFornecedorCliente('');
      setFormaPagamento('');
      setObservacoes('');
    }
  }, [conta, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      tipo,
      descricao,
      valor,
      data_vencimento: dataVencimento,
      fornecedor_cliente: fornecedorCliente || null,
      forma_pagamento: formaPagamento || null,
      observacoes: observacoes || null,
      status: 'pendente',
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{conta ? 'Editar' : 'Nova'} Conta a {tipo === 'pagar' ? 'Pagar' : 'Receber'}</DialogTitle>
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
              <Label className="text-slate-300">Vencimento</Label>
              <Input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-slate-300">{tipo === 'pagar' ? 'Fornecedor' : 'Cliente'}</Label>
            <Input value={fornecedorCliente} onChange={e => setFornecedorCliente(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div>
            <Label className="text-slate-300">Forma de Pagamento</Label>
            <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white">
              <option value="">—</option>
              <option value="pix">PIX</option>
              <option value="boleto">Boleto</option>
              <option value="transferencia">Transferência</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
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
