import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface MarcadorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: { id: string; nome: string; cor: string } | null;
  onSubmit: (nome: string, cor: string) => Promise<void> | void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#64748b',
];

export function MarcadorDialog({ open, onOpenChange, initial, onSubmit }: MarcadorDialogProps) {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#6366f1');

  useEffect(() => {
    if (open) {
      setNome(initial?.nome ?? '');
      setCor(initial?.cor ?? '#6366f1');
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!nome.trim()) return;
    await onSubmit(nome.trim(), cor);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar Marcador' : 'Novo Marcador'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value.substring(0, 40))}
              placeholder="Ex: Urgente, Aguardando cliente..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    cor === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!nome.trim()}>
              {initial ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}