import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import CloudIcon from "@/components/CloudIcon";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useLocalTheme } from "@/hooks/useLocalTheme";
import { AuthThemeToggle } from "@/components/Auth/AuthThemeToggle";
import { ArrowLeft } from "lucide-react";
import authOfficeBg from "@/assets/auth-office-bg.jpg";
const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mode, setMode] = useState<'login' | 'recovery'>('login');
  const {
    toast
  } = useToast();
  const {
    signIn,
    signUp,
    resetPassword
  } = useAuth();

  // Try to get tenant context (may not exist on legacy routes)
  let tenant = null;
  let tenantSlug = 'solvenza';
  try {
    const tenantContext = useTenant();
    tenant = tenantContext.tenant;
    tenantSlug = tenantContext.tenantSlug || 'solvenza';
  } catch {
    // useTenant throws if not in TenantProvider - that's ok for legacy routes
  }

  // Apply saved theme from localStorage
  useLocalTheme('auth-theme');
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const {
        error
      } = await signIn(email, password);
      if (error) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao fazer login.",
          variant: "destructive"
        });
      } else {
        // Remove transition flag from session to ensure it shows
        sessionStorage.removeItem('transition_completed');

        // Start transition fade-out
        setIsTransitioning(true);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao fazer login.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      // Pass tenant_id when signing up if we have one
      const {
        error
      } = await signUp(email, password, fullName, tenant?.id);
      if (error) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao criar conta.",
          variant: "destructive"
        });
      } else {
        // Remove transition flag from session to ensure it shows
        sessionStorage.removeItem('transition_completed');

        // Start transition fade-out
        setIsTransitioning(true);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar conta.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Erro",
        description: "Por favor, informe seu email.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/${tenantSlug}/reset-password`;
      const {
        error
      } = await resetPassword(email, redirectUrl);
      if (error) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao enviar email de recuperacao.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Email enviado",
          description: "Verifique sua caixa de entrada para redefinir sua senha."
        });
        setMode('login');
        setEmail("");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao enviar email.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <div className={`min-h-screen bg-gradient-subtle flex transition-opacity duration-500 relative overflow-hidden ${isTransitioning ? 'opacity-0 animate-fade-out' : 'opacity-100'}`}>
      {/* Floating Elements - espalhados pela tela toda */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-10 w-2 h-2 rounded-full bg-primary animate-float opacity-60" />
        <div className="absolute bottom-1/3 right-20 w-3 h-3 rounded-full bg-accent animate-float opacity-40" style={{
        animationDelay: '1s'
      }} />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-primary animate-float opacity-50" style={{
        animationDelay: '2s'
      }} />
        <div className="absolute top-20 left-1/4 w-2 h-2 rounded-full bg-primary animate-float opacity-50" style={{
        animationDelay: '0.5s'
      }} />
        <div className="absolute top-40 right-1/3 w-3 h-3 rounded-full bg-accent animate-float opacity-40" style={{
        animationDelay: '1.5s'
      }} />
        <div className="absolute bottom-32 left-1/3 w-2 h-2 rounded-full bg-primary animate-float opacity-60" style={{
        animationDelay: '2.5s'
      }} />
        <div className="absolute top-1/3 right-12 w-2 h-2 rounded-full bg-primary animate-float opacity-60" style={{
        animationDelay: '0.3s'
      }} />
        <div className="absolute bottom-1/4 left-16 w-3 h-3 rounded-full bg-accent animate-float opacity-50" style={{
        animationDelay: '1.8s'
      }} />
        <div className="absolute top-2/3 right-1/3 w-2 h-2 rounded-full bg-primary animate-float opacity-40" style={{
        animationDelay: '3s'
      }} />
        <div className="absolute top-10 left-1/3 w-3 h-3 rounded-full bg-primary animate-float opacity-50" style={{
        animationDelay: '0.7s'
      }} />
        <div className="absolute bottom-20 right-1/4 w-2 h-2 rounded-full bg-accent animate-float opacity-60" style={{
        animationDelay: '2.3s'
      }} />
      </div>

      {/* LADO ESQUERDO - Branding com imagem de fundo (60%) - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-3/5 flex-col items-start justify-start relative">
        {/* Imagem de fundo */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: `url(${authOfficeBg})`
      }} />
        
        {/* Overlay suave para melhorar legibilidade */}
        <div className="absolute inset-0 bg-black/35" />
        
        {/* Conteúdo posicionado no topo esquerdo */}
        <div className="relative z-10 flex flex-col items-start text-left px-10 pt-12">
          {/* Logo */}
          <div className="mb-2 flex flex-col items-start">
            <span className="text-5xl md:text-7xl font-bold tracking-wider">
              <span className="bg-gradient-to-r from-white via-white to-blue-300 bg-clip-text text-transparent">VOUTI</span>
              <span className="text-red-500">.</span>
            </span>
          </div>
          
          {/* Slogan */}
          <p className="text-sm md:text-base font-medium tracking-wide text-white/90">
            O melhor lugar de trabalho é <span className="text-white font-semibold">aqui</span>.
          </p>
        </div>
      </div>

      {/* LADO DIREITO - Formulário (40%) */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-4 lg:pr-16">
        <div className="w-full max-w-md animate-slide-in-left">
          {/* Mobile: Logo aparece acima do card */}
          <div className="lg:hidden text-center mb-6">
            <CloudIcon className="w-16 h-12 mx-auto mb-4 animate-float" />
            <span className="text-3xl font-bold tracking-wider block mb-3">
              <span className="bg-gradient-to-r from-gray-600 via-gray-800 to-blue-600 dark:from-gray-300 dark:via-white dark:to-blue-400 bg-clip-text text-transparent">VOUTI</span>
              <span className="text-red-500">.</span>
            </span>
            <p className="text-sm font-medium tracking-wide text-muted-foreground">
              O melhor lugar de trabalho é <span className="text-primary">aqui</span>.
            </p>
          </div>


          <Card className="shadow-card border-0 relative">
            {/* Toggle de tema minimalista */}
            <div className="absolute top-3 right-3">
              <AuthThemeToggle />
            </div>
            
            <CardHeader className="space-y-1 text-center pb-4">
              <h3 className="text-xl font-semibold text-foreground">
                {mode === 'login' ? 'Acesso ao Sistema' : 'Recuperar Senha'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {mode === 'login' ? 'Entre ou crie sua conta para continuar' : 'Informe seu email para receber o link de recuperacao'}
              </p>
            </CardHeader>
            <CardContent>
              <div className="w-full">
                {mode === 'login' ? <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input id="signin-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Senha</Label>
                      <Input id="signin-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
                    </div>

                    <button type="button" onClick={() => setMode('recovery')} className="text-sm text-primary hover:underline w-full text-right">
                      Esqueceu sua senha?
                    </button>

                    <Button type="submit" className="w-full" variant="professional" disabled={isLoading}>
                      {isLoading ? "Entrando..." : "Entrar"}
                    </Button>

                    <p className="text-[10px] text-muted-foreground text-center mt-3 leading-relaxed">
                      ao entrar, você concorda com os{' '}
                      <a href="/termos-de-uso" target="_blank" className="underline hover:text-primary">
                        termos de uso
                      </a>
                      ,{' '}
                      <a href="/licenca" target="_blank" className="underline hover:text-primary">
                        licença
                      </a>
                      {' '}e{' '}
                      <a href="/privacidade" target="_blank" className="underline hover:text-primary">
                        política de privacidade
                      </a>
                    </p>
                  </form> : <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recovery-email">Email</Label>
                      <Input id="recovery-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
                    </div>

                    <Button type="submit" className="w-full" variant="professional" disabled={isLoading}>
                      {isLoading ? "Enviando..." : "Enviar link de recuperacao"}
                    </Button>

                    <button type="button" onClick={() => setMode('login')} className="text-sm text-muted-foreground hover:text-foreground w-full text-center flex items-center justify-center gap-1">
                      <ArrowLeft className="h-3 w-3" />
                      Voltar ao login
                    </button>
                  </form>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default Auth;