import React, { useState } from 'react';
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
import { CheckCircle2, Loader2 } from 'lucide-react';

interface ConcluirEtapaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etapaNome: string;
  onConfirm: (comentario: string) => Promise<void>;
}

export function ConcluirEtapaModal({
  open,
  onOpenChange,
  etapaNome,
  onConfirm,
}: ConcluirEtapaModalProps) {
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!comentario.trim()) return;

    setSaving(true);
    try {
      await onConfirm(comentario.trim());
      setComentario('');
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setComentario('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Concluir Etapa
          </DialogTitle>
          <DialogDescription>
            Digite um comentário sobre a conclusão da etapa "<strong>{etapaNome}</strong>".
            Este comentário será anexado ao relatório do processo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="Descreva o que foi realizado nesta etapa..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            * Campo obrigatório para concluir a etapa
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!comentario.trim() || saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Concluir Etapa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
