import { useState } from 'react';
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
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSendCode = async () => {
    if (!email) {
      toast({ title: 'Informe seu e-mail', variant: 'destructive' });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke('spn-send-password-reset', {
      body: { email },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({
        title: 'Erro',
        description: (data as any)?.error || error?.message || 'Falha ao enviar código',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Código enviado!', description: 'Verifique seu e-mail.' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code) {
      toast({ title: 'Preencha e-mail e código', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Senha muito curta', description: 'Use ao menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Senhas não conferem', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('spn-verify-password-reset', {
      body: { email, code: code.trim(), new_password: password },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast({
        title: 'Erro',
        description: (data as any)?.error || error?.message || 'Falha ao atualizar senha',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Senha atualizada!', description: 'Faça login com a nova senha.' });
    navigate('/spn/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-900 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-center"><LogoSpn size="md" /></div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Redefinir senha</h1>
            <p className="text-sm text-muted-foreground">
              Informe seu e-mail, peça o código e defina uma nova senha.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="flex gap-2">
                <Input
                  id="email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  placeholder="your@email.com"
                />
                <Button
                  type="button" onClick={handleSendCode}
                  disabled={sending || !email}
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  {sending ? 'Enviando...' : 'Enviar código'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Código (6 dígitos)</Label>
              <Input
                id="code" inputMode="numeric" maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="text-center text-xl tracking-[0.5em] font-mono"
              />
            </div>

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
            <button
              type="button"
              onClick={() => navigate('/spn/auth')}
              className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Voltar ao login
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpnResetPassword;