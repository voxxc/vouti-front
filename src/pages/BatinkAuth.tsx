import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBatinkAuth } from '@/contexts/BatinkAuthContext';
import { toast } from '@/hooks/use-toast';

const BatinkAuth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useBatinkAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Login form
  const [loginData, setLoginData] = useState({ login: '', password: '' });
  
  // Signup form
  const [signupData, setSignupData] = useState({
    login: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    empresa: '',
  });

  // Redirect if already logged in
  if (user && !authLoading) {
    navigate('/batink/dashboard');
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.login || !loginData.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha login e senha.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Normalize login to email format
    const email = loginData.login.includes('@') 
      ? loginData.login 
      : `${loginData.login}@batink.local`;

    const { error } = await signIn(email, loginData.password);
    
    if (error) {
      toast({
        title: "Erro no login",
        description: "Credenciais inválidas. Verifique e tente novamente.",
        variant: "destructive",
      });
    } else {
      navigate('/batink/dashboard');
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupData.login || !signupData.password || !signupData.fullName) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas não são iguais.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Normalize login to email format
    const email = signupData.login.includes('@') 
      ? signupData.login 
      : `${signupData.login}@batink.local`;

    const { error } = await signUp(email, signupData.password, signupData.fullName, signupData.empresa);
    
    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Não foi possível criar a conta.",
        variant: "destructive",
      });
    } else {
      navigate('/batink/dashboard');
    }
    
    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1625]">
        <Loader2 className="w-8 h-8 animate-spin text-[#9333EA]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1625] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>
      
      {/* Gradient Orbs */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-[#9333EA]/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-[#EC4899]/20 rounded-full blur-[100px]" />
      
      <Card className="w-full max-w-md bg-[#2d2640]/90 backdrop-blur-xl border-white/10 text-white relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9333EA] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-[#9333EA]/30">
            <Clock className="w-9 h-9 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">BATINK</CardTitle>
            <CardDescription className="text-white/60">Ponto Digital</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#1a1625] mb-6">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-[#9333EA] data-[state=active]:text-white text-white/60"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="data-[state=active]:bg-[#9333EA] data-[state=active]:text-white text-white/60"
              >
                Cadastrar
              </TabsTrigger>
            </TabsList>
            
            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login" className="text-white/80">Login</Label>
                  <Input
                    id="login"
                    placeholder="Seu login"
                    value={loginData.login}
                    onChange={(e) => setLoginData(prev => ({ ...prev, login: e.target.value }))}
                    className="bg-[#1a1625] border-white/20 text-white placeholder:text-white/40 focus:border-[#9333EA]"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/80">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-[#1a1625] border-white/20 text-white placeholder:text-white/40 focus:border-[#9333EA]"
                    disabled={isLoading}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-[#9333EA] hover:bg-[#7C3AED] text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            {/* Signup Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-white/80">Nome completo *</Label>
                  <Input
                    id="signup-name"
                    placeholder="Seu nome"
                    value={signupData.fullName}
                    onChange={(e) => setSignupData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="bg-[#1a1625] border-white/20 text-white placeholder:text-white/40 focus:border-[#9333EA]"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-empresa" className="text-white/80">Empresa</Label>
                  <Input
                    id="signup-empresa"
                    placeholder="Nome da empresa"
                    value={signupData.empresa}
                    onChange={(e) => setSignupData(prev => ({ ...prev, empresa: e.target.value }))}
                    className="bg-[#1a1625] border-white/20 text-white placeholder:text-white/40 focus:border-[#9333EA]"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-login" className="text-white/80">Login *</Label>
                  <Input
                    id="signup-login"
                    placeholder="Escolha um login"
                    value={signupData.login}
                    onChange={(e) => setSignupData(prev => ({ ...prev, login: e.target.value }))}
                    className="bg-[#1a1625] border-white/20 text-white placeholder:text-white/40 focus:border-[#9333EA]"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-white/80">Senha *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={signupData.password}
                    onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-[#1a1625] border-white/20 text-white placeholder:text-white/40 focus:border-[#9333EA]"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm" className="text-white/80">Confirmar senha *</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="Repita a senha"
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="bg-[#1a1625] border-white/20 text-white placeholder:text-white/40 focus:border-[#9333EA]"
                    disabled={isLoading}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-[#9333EA] hover:bg-[#7C3AED] text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Cadastrar'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          {/* Back to landing link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/batink')}
              className="text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              ← Voltar para o site
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatinkAuth;
