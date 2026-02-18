import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";
import { useLocalTheme } from "@/hooks/useLocalTheme";
import { AuthThemeToggle } from "@/components/Auth/AuthThemeToggle";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import authOfficeBg from "@/assets/auth-office-bg.jpg";

const CrmLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mode, setMode] = useState<'login' | 'recovery'>('login');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { tenant } = useParams<{ tenant: string }>();

  useLocalTheme('auth-theme');

  const [tenantValid, setTenantValid] = useState<boolean | null>(null);

  // Validate tenant belongs to CRM system_type and check if already logged in
  useEffect(() => {
    const validateTenant = async () => {
      if (!tenant) {
        setTenantValid(false);
        return;
      }
      const { data } = await supabase
        .from('tenants')
        .select('id, system_type_id, system_types!inner(code)')
        .eq('slug', tenant)
        .eq('system_types.code', 'crm')
        .maybeSingle();

      if (!data) {
        setTenantValid(false);
        return;
      }
      setTenantValid(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) navigate(`/crm/${tenant}/app`, { replace: true });
    };
    validateTenant();
  }, [navigate, tenant]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Erro", description: "Por favor, preencha todos os campos.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Erro", description: error.message || "Erro ao fazer login.", variant: "destructive" });
      } else {
        setIsTransitioning(true);
        setTimeout(() => navigate(`/crm/${tenant}/app`, { replace: true }), 500);
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado ao fazer login.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Erro", description: "Por favor, informe seu email.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-password-reset", {
        body: { email: email.toLowerCase(), tenant_slug: "crm" },
      });
      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || error?.message || "Erro ao enviar email.", variant: "destructive" });
      } else {
        toast({ title: "Código enviado!", description: "Verifique sua caixa de entrada para obter o código de 6 dígitos." });
        setMode('login');
        setEmail("");
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado ao enviar email.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (tenantValid === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (tenantValid === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">CRM não encontrado</h1>
          <p className="text-muted-foreground">O endereço informado não corresponde a um sistema Vouti.CRM válido.</p>
          <p className="text-sm text-muted-foreground">Verifique o endereço e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-subtle flex transition-opacity duration-500 relative overflow-hidden ${isTransitioning ? 'opacity-0 animate-fade-out' : 'opacity-100'}`}>
      {/* Floating Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-10 w-2 h-2 rounded-full bg-primary animate-float opacity-60" />
        <div className="absolute bottom-1/3 right-20 w-3 h-3 rounded-full bg-accent animate-float opacity-40" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-primary animate-float opacity-50" style={{ animationDelay: '2s' }} />
        <div className="absolute top-20 left-1/4 w-2 h-2 rounded-full bg-primary animate-float opacity-50" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-40 right-1/3 w-3 h-3 rounded-full bg-accent animate-float opacity-40" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-32 left-1/3 w-2 h-2 rounded-full bg-primary animate-float opacity-60" style={{ animationDelay: '2.5s' }} />
        <div className="absolute top-1/3 right-12 w-2 h-2 rounded-full bg-primary animate-float opacity-60" style={{ animationDelay: '0.3s' }} />
        <div className="absolute bottom-1/4 left-16 w-3 h-3 rounded-full bg-accent animate-float opacity-50" style={{ animationDelay: '1.8s' }} />
        <div className="absolute top-2/3 right-1/3 w-2 h-2 rounded-full bg-primary animate-float opacity-40" style={{ animationDelay: '3s' }} />
      </div>

      {/* LEFT SIDE - Branding */}
      <div className="hidden lg:flex lg:w-3/5 flex-col items-start justify-start relative">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${authOfficeBg})` }} />
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative z-10 flex flex-col items-start text-left px-10 pt-12">
          <div className="mb-2 flex flex-col items-start">
            <span className="text-5xl md:text-7xl font-black tracking-tight lowercase">
              <span className="text-white">vouti</span>
              <span className="text-[#E11D48]">.crm</span>
            </span>
          </div>
          <p className="text-sm md:text-base font-medium tracking-wide text-white/90">
            Gestão inteligente de <span className="text-white font-semibold">clientes</span>.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE - Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-4 lg:pr-16">
        <div className="w-full max-w-md animate-slide-in-left">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <span className="text-3xl font-black tracking-tight lowercase block mb-3">
              <span className="text-foreground">vouti</span>
              <span className="text-[#E11D48]">.crm</span>
            </span>
            <p className="text-sm font-medium tracking-wide text-muted-foreground">
              Gestão inteligente de <span className="text-primary">clientes</span>.
            </p>
          </div>

          <Card className="shadow-card border-0 relative">
            <div className="absolute top-3 right-3">
              <AuthThemeToggle />
            </div>
            
            <CardHeader className="space-y-1 text-center pb-4">
              <h3 className="text-xl font-semibold text-foreground">
                {mode === 'login' ? 'Acesso ao CRM' : 'Recuperar Senha'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {mode === 'login' ? 'Entre com suas credenciais para continuar' : 'Informe seu email para receber o link de recuperação'}
              </p>
            </CardHeader>
            <CardContent>
              {mode === 'login' ? (
                <form onSubmit={handleSignIn} className="space-y-4">
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
                    ao entrar, você concorda com o{' '}
                    <a href="/docs/termos-uso-licenca-vouti.pdf" download className="underline hover:text-primary">termo de uso e licença</a>
                    {' '}e{' '}
                    <a href="/docs/politica-de-privacidade.pdf" download className="underline hover:text-primary">política de privacidade</a>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recovery-email">Email</Label>
                    <Input id="recovery-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
                  </div>
                  <Button type="submit" className="w-full" variant="professional" disabled={isLoading}>
                    {isLoading ? "Enviando..." : "Enviar link de recuperação"}
                  </Button>
                  <button type="button" onClick={() => setMode('login')} className="text-sm text-muted-foreground hover:text-foreground w-full text-center flex items-center justify-center gap-1">
                    <ArrowLeft className="h-3 w-3" />
                    Voltar ao login
                  </button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CrmLogin;
