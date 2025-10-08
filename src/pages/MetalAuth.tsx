import { useState } from 'react';
import { useMetalAuth } from '@/contexts/MetalAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, Factory } from 'lucide-react';

const MetalAuth = () => {
  const { signIn, signUp, user } = useMetalAuth();
  const navigate = useNavigate();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [setor, setSetor] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    navigate('/metal-dashboard');
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!login || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha login e senha.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Convert login to email format
    const email = `${login.toLowerCase().trim()}@metalsystem.local`;
    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate('/metal-dashboard');
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!login || !password || !fullName) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Convert login to email format
    const email = `${login.toLowerCase().trim()}@metalsystem.local`;
    const { error } = await signUp(email, password, fullName, setor);

    if (error) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate('/metal-dashboard');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <Card className="w-full max-w-md relative z-10 border-slate-700 bg-slate-900/90 backdrop-blur">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-orange-500/20 rounded-full">
              <Factory className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">MetalSystem</CardTitle>
          <CardDescription className="text-slate-400">
            Sistema de Rastreamento de Produção
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-login" className="text-slate-200">Login</Label>
                  <Input
                    id="signin-login"
                    type="text"
                    placeholder="Ex: matheus"
                    value={login}
                    onChange={(e) => setLogin(e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ''))}
                    disabled={isLoading}
                    className="bg-slate-800 border-slate-700 text-white"
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
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-slate-200">Nome Completo *</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-login" className="text-slate-200">Login *</Label>
                  <Input
                    id="signup-login"
                    type="text"
                    placeholder="Ex: matheus"
                    value={login}
                    onChange={(e) => setLogin(e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ''))}
                    disabled={isLoading}
                    className="bg-slate-800 border-slate-700 text-white"
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
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-setor" className="text-slate-200">Setor</Label>
                  <Input
                    id="signup-setor"
                    type="text"
                    placeholder="Ex: Corte, Dobra, Solda..."
                    value={setor}
                    onChange={(e) => setSetor(e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetalAuth;
