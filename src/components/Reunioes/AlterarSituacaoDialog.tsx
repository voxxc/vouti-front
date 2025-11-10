import { useState } from 'react';
import { Reuniao } from '@/types/reuniao';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AlterarSituacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reuniao: Reuniao | null;
  situacao: 'desmarcada' | 'remarcada';
  onConfirm: (motivo?: string) => void;
}

export const AlterarSituacaoDialog = ({
  open,
  onOpenChange,
  reuniao,
  situacao,
  onConfirm,
}: AlterarSituacaoDialogProps) => {
  const [motivo, setMotivo] = useState('');

  const handleConfirm = () => {
    onConfirm(motivo || undefined);
    setMotivo('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setMotivo('');
    onOpenChange(false);
  };

  if (!reuniao) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {situacao === 'desmarcada' ? 'Desmarcar Reunião' : 'Remarcar Reunião'}
          </DialogTitle>
          <DialogDescription>
            {situacao === 'desmarcada'
              ? 'Esta reunião será removida da agenda mas ficará registrada no histórico do cliente.'
              : 'Esta reunião será marcada como remarcada e removida da agenda.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Reunião:</p>
            <p className="text-sm text-muted-foreground">{reuniao.titulo}</p>
            {reuniao.cliente_nome && (
              <p className="text-sm text-muted-foreground">Cliente: {reuniao.cliente_nome}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Data: {new Date(reuniao.data).toLocaleDateString('pt-BR')} às {reuniao.horario}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo (opcional)
            </Label>
            <Textarea
              id="motivo"
              placeholder={`Informe o motivo da ${situacao === 'desmarcada' ? 'desmarcação' : 'remarcação'}...`}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button 
            variant={situacao === 'desmarcada' ? 'destructive' : 'default'}
            onClick={handleConfirm}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
