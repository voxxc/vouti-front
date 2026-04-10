import { useState } from 'react';
import { useVotechAuth } from '@/contexts/VotechAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, TrendingUp, DollarSign, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const VotechAuth = () => {
  const { signIn, signUp, user } = useVotechAuth();
  const navigate = useNavigate();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    navigate('/votech/dashboard');
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!login || !password) {
      toast({ title: "Campos obrigatórios", description: "Preencha login e senha.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const normalized = login.trim().toLowerCase();
    const email = normalized.includes('@') ? normalized : `${normalized}@votech.local`;
    const { error } = await signIn(email, password);

    if (error) {
      toast({ title: "Erro ao fazer login", description: error.message, variant: "destructive" });
    } else {
      navigate('/votech/dashboard');
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!login || !password || !fullName) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const normalized = login.trim().toLowerCase();
    const email = normalized.includes('@') ? normalized : `${normalized}@votech.local`;
    const { error } = await signUp(email, password, fullName, empresa);

    if (error) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
    } else {
      navigate('/votech/dashboard');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl" />
      </div>

      {/* Decorative floating finance cards */}
      <div className="hidden lg:block absolute top-24 left-12 opacity-30">
        <div className="bg-emerald-500/20 backdrop-blur border border-emerald-500/20 rounded-xl p-4 w-52 transform -rotate-6">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium mb-1">
            <ArrowUpRight className="w-3 h-3" /> Receitas
          </div>
          <p className="text-emerald-300 text-lg font-bold">R$ 45.200,00</p>
          <p className="text-emerald-400/60 text-xs mt-1">+12.5% este mês</p>
        </div>
      </div>

      <div className="hidden lg:block absolute bottom-32 left-16 opacity-25">
        <div className="bg-purple-500/20 backdrop-blur border border-purple-500/20 rounded-xl p-4 w-48 transform rotate-3">
          <div className="flex items-center gap-2 text-purple-400 text-xs font-medium mb-1">
            <PiggyBank className="w-3 h-3" /> Investimentos
          </div>
          <p className="text-purple-300 text-lg font-bold">R$ 128.500</p>
        </div>
      </div>

      <div className="hidden lg:block absolute top-32 right-16 opacity-25">
        <div className="bg-rose-500/20 backdrop-blur border border-rose-500/20 rounded-xl p-4 w-48 transform rotate-6">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-medium mb-1">
            <ArrowDownRight className="w-3 h-3" /> Despesas
          </div>
          <p className="text-rose-300 text-lg font-bold">R$ 18.340,00</p>
          <p className="text-rose-400/60 text-xs mt-1">-3.2% este mês</p>
        </div>
      </div>

      <div className="hidden lg:block absolute bottom-24 right-12 opacity-30">
        <div className="bg-blue-500/20 backdrop-blur border border-blue-500/20 rounded-xl p-4 w-52 transform -rotate-3">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1">
            <TrendingUp className="w-3 h-3" /> Saldo
          </div>
          <p className="text-blue-300 text-lg font-bold">R$ 26.860,00</p>
          <p className="text-blue-400/60 text-xs mt-1">Atualizado agora</p>
        </div>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-md relative z-10 border-indigo-500/20 bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-indigo-500/10">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="flex justify-center mb-1">
            <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-black text-white tracking-tight">
              Vo<span className="text-indigo-400">Tech</span>
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              Plataforma de Controle Financeiro
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/60 mb-6">
              <TabsTrigger value="signin" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
                Criar conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-login" className="text-slate-200">Login</Label>
                  <Input
                    id="signin-login"
                    type="text"
                    placeholder="seu.login"
                    value={login}
                    onChange={(e) => setLogin(e.target.value.toLowerCase().replace(/[^a-z0-9.@]/g, ''))}
                    disabled={isLoading}
                    className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-slate-200">Senha</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 border-0"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
                  ) : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-slate-200">Nome completo *</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-empresa" className="text-slate-200">Empresa</Label>
                  <Input
                    id="signup-empresa"
                    type="text"
                    placeholder="Nome da empresa (opcional)"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-login" className="text-slate-200">Login *</Label>
                  <Input
                    id="signup-login"
                    type="text"
                    placeholder="seu.login"
                    value={login}
                    onChange={(e) => setLogin(e.target.value.toLowerCase().replace(/[^a-z0-9.@]/g, ''))}
                    disabled={isLoading}
                    className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-slate-200">Senha *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 border-0"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando conta...</>
                  ) : 'Criar conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default VotechAuth;
