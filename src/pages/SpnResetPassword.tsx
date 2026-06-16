import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import LogoSpn from '@/components/Spn/LogoSpn';
import { toast } from '@/hooks/use-toast';

const SpnResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user && !cancelled) setReady(true);
    });

    (async () => {
      // 1) Novo formato: ?token_hash=...&type=recovery
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: (type as any) || 'recovery',
          token_hash: tokenHash,
        });
        if (cancelled) return;
        if (error) {
          setLinkError(error.message);
        } else {
          setReady(true);
          // limpa a URL
          window.history.replaceState({}, '', '/spn/reset-password');
        }
        return;
      }

      // 2) Formato antigo (hash com access_token) ou sessão já presente
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        setReady(true);
        return;
      }

      // 3) Aguarda 3s pelo onAuthStateChange; senão, mostra erro
      setTimeout(() => {
        if (!cancelled) {
          setLinkError(prev => prev ?? 'Link inválido ou expirado. Solicite novamente em "Esqueci minha senha".');
        }
      }, 3000);
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
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
            linkError ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{linkError}</p>
                <Button onClick={() => navigate('/spn/auth')} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Voltar ao login
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Validando link de recuperação...
              </p>
            )
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