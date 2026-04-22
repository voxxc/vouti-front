import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function SuperAdminOwnPasswordCard({ email }: { email: string | null }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      toast({ title: 'Senha invalida', description: 'A nova senha deve ter pelo menos 8 caracteres.', variant: 'destructive' });
      return;
    }
    if (next !== confirm) {
      toast({ title: 'Senhas nao conferem', description: 'A confirmacao deve ser igual a nova senha.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('super-admin-update-own-password', {
      body: { current_password: current, new_password: next },
    });
    setLoading(false);
    const errMsg = (data as { error?: string } | null)?.error || error?.message;
    if (errMsg) {
      toast({ title: 'Erro', description: errMsg, variant: 'destructive' });
      return;
    }
    setCurrent(''); setNext(''); setConfirm('');
    toast({ title: 'Senha atualizada', description: 'Sua senha de Super Admin foi alterada com sucesso.' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" /> Minha conta de Super Admin
        </CardTitle>
        <CardDescription>
          Logado como <strong>{email ?? '—'}</strong>. Altere sua senha de acesso ao painel master.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3 max-w-3xl">
          <div className="space-y-2">
            <Label htmlFor="cur-pass">Senha atual</Label>
            <Input id="cur-pass" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pass-self">Nova senha</Label>
            <Input id="new-pass-self" type="password" value={next} onChange={(e) => setNext(e.target.value)} disabled={loading} placeholder="Min. 8 caracteres" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pass-self">Confirmar nova senha</Label>
            <Input id="confirm-pass-self" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={loading} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" disabled={loading || !current || !next || !confirm}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Atualizar minha senha
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}