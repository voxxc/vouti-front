import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import LogoSpn from '@/components/Spn/LogoSpn';
import { toast } from '@/hooks/use-toast';

const SpnResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // When Supabase redirects from the recovery email it sets the session
    // automatically via the hash. Wait for an authenticated session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Senha muito curta', description: 'Use ao menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Senhas não conferem', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Senha atualizada!', description: 'Faça login com a nova senha.' });
    await supabase.auth.signOut();
    navigate('/spn/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-900 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-center"><LogoSpn size="md" /></div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Redefinir senha</h1>
            <p className="text-sm text-muted-foreground">Defina uma nova senha para sua conta.</p>
          </div>
          {!ready ? (
            <p className="text-sm text-muted-foreground">
              Validando link de recuperação... Se você acessou esta página diretamente, abra o link enviado por e-mail.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pass">Nova senha</Label>
                <Input id="new-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pass">Confirmar nova senha</Label>
                <Input id="confirm-pass" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SpnResetPassword;