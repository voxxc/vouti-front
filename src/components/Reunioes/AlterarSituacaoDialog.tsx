import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Reuniao, HORARIOS_DISPONIVEIS } from '@/types/reuniao';
import { parseLocalDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AlterarSituacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reuniao: Reuniao | null;
  situacao: 'desmarcada' | 'remarcada';
  onConfirm: (motivo?: string, novaData?: string, novoHorario?: string) => void;
}

export const AlterarSituacaoDialog = ({
  open,
  onOpenChange,
  reuniao,
  situacao,
  onConfirm,
}: AlterarSituacaoDialogProps) => {
  const [motivo, setMotivo] = useState('');
  const [novaData, setNovaData] = useState<Date | undefined>();
  const [novoHorario, setNovoHorario] = useState<string>('');

  useEffect(() => {
    if (reuniao && open) {
      setNovaData(parseLocalDate(reuniao.data));
      setNovoHorario(reuniao.horario);
      setMotivo('');
    }
  }, [reuniao, open]);

  const handleConfirm = () => {
    if (situacao === 'remarcada' && novaData) {
      const dataStr = format(novaData, 'yyyy-MM-dd');
      onConfirm(motivo || undefined, dataStr, novoHorario);
    } else {
      onConfirm(motivo || undefined);
    }
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
              : 'Selecione a nova data e horário para esta reunião.'}
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
              Data atual: {new Date(reuniao.data + 'T12:00:00').toLocaleDateString('pt-BR')} às {reuniao.horario}
            </p>
          </div>

          {situacao === 'remarcada' && (
            <div className="space-y-4 rounded-md border p-3">
              <p className="text-sm font-medium">Nova data e horário</p>
              
              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !novaData && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {novaData ? format(novaData, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={novaData}
                      onSelect={setNovaData}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Horário</Label>
                <Select value={novoHorario} onValueChange={setNovoHorario}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {HORARIOS_DISPONIVEIS.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
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
          <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button
            variant={situacao === 'desmarcada' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={situacao === 'remarcada' && (!novaData || !novoHorario)}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
