import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface AddProtocoloDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { nome: string }) => Promise<void>;
}

export function AddProtocoloDialog({ open, onOpenChange, onSubmit }: AddProtocoloDialogProps) {
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!nome.trim()) return;

    setSaving(true);
    try {
      await onSubmit({ nome: nome.trim() });
      setNome('');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setNome('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Protocolo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Protocolo *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Revisional ITAU"
              disabled={saving}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !nome.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar Protocolo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
