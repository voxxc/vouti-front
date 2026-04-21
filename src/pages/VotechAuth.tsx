import { useState } from 'react';
import { useVotechAuth } from '@/contexts/VotechAuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';

const FONT_STACK = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, system-ui, sans-serif';
const inputCls = "h-12 rounded-xl bg-[#E5E5EA] border-0 text-black placeholder:text-black/40 focus-visible:ring-2 focus-visible:ring-[#30D158]/40 focus-visible:ring-offset-0 px-4";

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
    if (error) toast({ title: "Erro ao fazer login", description: error.message, variant: "destructive" });
    else navigate('/votech/dashboard');
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
    if (error) toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
    else navigate('/votech/dashboard');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col" style={{ fontFamily: FONT_STACK }}>
      {/* mesh gradient sutil no topo */}
      <div className="absolute inset-x-0 top-0 h-[480px] overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#30D158]/12 blur-3xl" />
        <div className="absolute top-10 right-0 w-[400px] h-[400px] rounded-full bg-[#0A84FF]/10 blur-3xl" />
      </div>

      {/* header */}
      <header className="relative z-10 px-5 h-12 flex items-center">
        <Link to="/votech" className="inline-flex items-center gap-1.5 text-[13px] text-black/60 hover:text-black transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </Link>
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">
          {/* logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-[28px] font-semibold tracking-tight text-black">Vo</span>
              <span className="w-2 h-2 rounded-full bg-[#30D158]" />
              <span className="text-[28px] font-semibold tracking-tight text-black">tech</span>
            </div>
            <p className="text-[13px] text-black/50">Suas finanças. Em paz.</p>
          </div>

          {/* card */}
          <div className="bg-white rounded-3xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.12)] p-6 sm:p-8">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-[#E5E5EA] rounded-full h-10 p-1 mb-6">
                <TabsTrigger value="signin" className="rounded-full text-[13px] font-medium text-black/60 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full text-[13px] font-medium text-black/60 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm">
                  Criar conta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-login" className="text-[12px] font-medium text-black/60 px-1">Login</Label>
                    <Input
                      id="signin-login"
                      type="text"
                      placeholder="seu.login"
                      value={login}
                      onChange={(e) => setLogin(e.target.value.toLowerCase().replace(/[^a-z0-9.@]/g, ''))}
                      disabled={isLoading}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-password" className="text-[12px] font-medium text-black/60 px-1">Senha</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className={inputCls}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-full bg-black hover:bg-black/85 text-white text-[14px] font-medium mt-3 border-0"
                    disabled={isLoading}
                  >
                    {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>) : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-[12px] font-medium text-black/60 px-1">Nome completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isLoading}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-empresa" className="text-[12px] font-medium text-black/60 px-1">Empresa <span className="text-black/30">(opcional)</span></Label>
                    <Input
                      id="signup-empresa"
                      type="text"
                      placeholder="Nome da empresa"
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      disabled={isLoading}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-login" className="text-[12px] font-medium text-black/60 px-1">Login</Label>
                    <Input
                      id="signup-login"
                      type="text"
                      placeholder="seu.login"
                      value={login}
                      onChange={(e) => setLogin(e.target.value.toLowerCase().replace(/[^a-z0-9.@]/g, ''))}
                      disabled={isLoading}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-[12px] font-medium text-black/60 px-1">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className={inputCls}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-full bg-[#30D158] hover:bg-[#28b84c] text-white text-[14px] font-medium mt-3 border-0"
                    disabled={isLoading}
                  >
                    {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando conta...</>) : 'Criar conta grátis'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="mt-6 text-center text-[11px] text-black/40">
            Ao continuar, você concorda com os termos do VoTech.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VotechAuth;