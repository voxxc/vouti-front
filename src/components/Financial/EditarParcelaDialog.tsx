import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ClienteParcela } from '@/types/financeiro';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTenantId } from '@/hooks/useTenantId';
import { parseLocalDate } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface EditarParcelaDialogProps {
  parcela: ClienteParcela | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditarParcelaDialog = ({
  parcela,
  open,
  onOpenChange,
  onSuccess,
}: EditarParcelaDialogProps) => {
  const { tenantId } = useTenantId();
  const [loading, setLoading] = useState(false);
  const [numeroParcela, setNumeroParcela] = useState('');
  const [valorParcela, setValorParcela] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [grupoDescricao, setGrupoDescricao] = useState('');

  useEffect(() => {
    if (parcela && open) {
      setNumeroParcela(parcela.numero_parcela.toString());
      setValorParcela(parcela.valor_parcela.toString());
      setDataVencimento(parcela.data_vencimento);
      setGrupoDescricao(parcela.grupo_descricao || '');
    }
  }, [parcela, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parcela) return;

    setLoading(true);
    try {
      // Calcular novo status baseado na data de vencimento
      const novaDataVencimento = parseLocalDate(dataVencimento);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      // Apenas recalcular status se a parcela estiver pendente ou atrasada
      let novoStatus = parcela.status;
      if (parcela.status === 'pendente' || parcela.status === 'atrasado') {
        novoStatus = novaDataVencimento < hoje ? 'atrasado' : 'pendente';
      }

      // Calcular saldo restante se for parcela parcial e valor mudou
      const novoValor = parseFloat(valorParcela);
      let novoSaldoRestante = parcela.saldo_restante;
      if (parcela.status === 'parcial' && parcela.valor_pago) {
        novoSaldoRestante = novoValor - parcela.valor_pago;
        if (novoSaldoRestante <= 0) {
          novoStatus = 'pago';
          novoSaldoRestante = 0;
        }
      }

      const { error } = await supabase
        .from('cliente_parcelas')
        .update({
          numero_parcela: parseInt(numeroParcela),
          valor_parcela: novoValor,
          data_vencimento: dataVencimento,
          grupo_descricao: grupoDescricao || null,
          status: novoStatus,
          saldo_restante: novoSaldoRestante,
        })
        .eq('id', parcela.id);

      if (error) throw error;

      // Registrar alteração no histórico
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const alteracoes: string[] = [];
        if (parcela.numero_parcela !== parseInt(numeroParcela)) {
          alteracoes.push(`número: ${parcela.numero_parcela} → ${numeroParcela}`);
        }
        if (parcela.valor_parcela !== novoValor) {
          alteracoes.push(`valor: ${formatCurrency(parcela.valor_parcela)} → ${formatCurrency(novoValor)}`);
        }
        if (parcela.data_vencimento !== dataVencimento) {
          alteracoes.push(`vencimento: ${format(parseLocalDate(parcela.data_vencimento), 'dd/MM/yyyy')} → ${format(parseLocalDate(dataVencimento), 'dd/MM/yyyy')}`);
        }
        if ((parcela.grupo_descricao || '') !== grupoDescricao) {
          alteracoes.push(`descrição: "${parcela.grupo_descricao || ''}" → "${grupoDescricao}"`);
        }

        if (alteracoes.length > 0) {
          await supabase
            .from('cliente_pagamento_comentarios')
            .insert({
              parcela_id: parcela.id,
              user_id: user.id,
              comentario: `Parcela editada: ${alteracoes.join(', ')}`,
              tenant_id: tenantId
            });
        }
      }

      toast({
        title: 'Parcela atualizada',
        description: 'Os dados da parcela foram atualizados com sucesso.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar os dados da parcela.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!parcela) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Parcela #{parcela.numero_parcela}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="numero-parcela">Número da Parcela</Label>
            <Input
              id="numero-parcela"
              type="number"
              min="1"
              value={numeroParcela}
              onChange={(e) => setNumeroParcela(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor-parcela">Valor da Parcela</Label>
            <Input
              id="valor-parcela"
              type="number"
              step="0.01"
              min="0.01"
              value={valorParcela}
              onChange={(e) => setValorParcela(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data-vencimento">Data de Vencimento</Label>
            <Input
              id="data-vencimento"
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="grupo-descricao">Grupo/Descrição</Label>
            <Textarea
              id="grupo-descricao"
              value={grupoDescricao}
              onChange={(e) => setGrupoDescricao(e.target.value)}
              placeholder="Descrição ou grupo da parcela..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
