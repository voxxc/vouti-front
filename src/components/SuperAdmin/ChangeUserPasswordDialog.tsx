import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ChangeUserPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { user_id: string; email: string | null; full_name: string | null } | null;
}

export function ChangeUserPasswordDialog({ open, onOpenChange, user }: ChangeUserPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setConfirm('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (password.length < 8) {
      toast({ title: 'Senha invalida', description: 'A senha deve ter pelo menos 8 caracteres.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Senhas nao conferem', description: 'A confirmacao deve ser igual a nova senha.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke('super-admin-update-user', {
      body: { user_id: user.user_id, password },
    });
    setLoading(false);

    const errMsg = (data as { error?: string } | null)?.error || error?.message;
    if (errMsg) {
      toast({ title: 'Erro', description: errMsg, variant: 'destructive' });
      return;
    }

    toast({ title: 'Senha atualizada', description: `Nova senha definida para ${user.email}.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trocar senha</DialogTitle>
          <DialogDescription>
            Defina uma nova senha para <strong>{user?.email}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-pass">Nova senha</Label>
            <Input id="new-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} placeholder="Minimo 8 caracteres" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pass">Confirmar nova senha</Label>
            <Input id="confirm-pass" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={loading} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Atualizar senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}