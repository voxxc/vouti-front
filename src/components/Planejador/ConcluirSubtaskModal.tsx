import React, { useState, useEffect } from 'react';
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

interface ConcluirSubtaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtaskTitulo: string;
  onConfirm: (comentario: string) => Promise<void> | void;
  onCancel?: () => void;
}

export function ConcluirSubtaskModal({
  open,
  onOpenChange,
  subtaskTitulo,
  onConfirm,
  onCancel,
}: ConcluirSubtaskModalProps) {
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setComentario('');
  }, [open]);

  const handleConfirm = async () => {
    if (!comentario.trim()) return;
    setSaving(true);
    try {
      await onConfirm(comentario.trim());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); else onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Concluir subtarefa
          </DialogTitle>
          <DialogDescription>
            Descreva o que foi feito para concluir "<strong>{subtaskTitulo}</strong>".
            Este comentário ficará registrado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            placeholder="Ex.: petição protocolada, documento revisado..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={4}
            className="resize-none"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">* Campo obrigatório</p>
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
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Concluir subtarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}