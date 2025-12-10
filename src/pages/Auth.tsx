import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();
  
  // Try to get tenant context (may not exist on legacy routes)
  let tenant = null;
  try {
    const tenantContext = useTenant();
    tenant = tenantContext.tenant;
  } catch {
    // useTenant throws if not in TenantProvider - that's ok for legacy routes
  }

  // Force dark theme on auth page
  useEffect(() => {
    const root = document.documentElement;
    const hadLightTheme = root.classList.contains('light');
    
    root.classList.remove('light');
    root.classList.add('dark');
    
    return () => {
      root.classList.remove('dark');
      if (hadLightTheme) {
        root.classList.add('light');
      }
    };
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao fazer login.",
          variant: "destructive",
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
        variant: "destructive",
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
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Pass tenant_id when signing up if we have one
      const { error } = await signUp(email, password, fullName, tenant?.id);
      
      if (error) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao criar conta.",
          variant: "destructive",
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
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-subtle flex items-center justify-center p-4 transition-opacity duration-500 relative overflow-hidden ${
      isTransitioning ? 'opacity-0 animate-fade-out' : 'opacity-100'
    }`}>
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
        <div className="absolute top-10 left-1/3 w-3 h-3 rounded-full bg-primary animate-float opacity-50" style={{ animationDelay: '0.7s' }} />
        <div className="absolute bottom-20 right-1/4 w-2 h-2 rounded-full bg-accent animate-float opacity-60" style={{ animationDelay: '2.3s' }} />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          {/* Show tenant name if available */}
          {tenant && (
            <p className="text-sm text-muted-foreground mb-2">{tenant.name}</p>
          )}
          <Logo size="lg" className="justify-center mb-6" />
        </div>

        <Card className="shadow-card border-0">
          <CardHeader className="space-y-1 text-center pb-4">
            <h3 className="text-xl font-semibold text-foreground">Acesso ao Sistema</h3>
            <p className="text-sm text-muted-foreground">
              Entre ou crie sua conta para continuar
            </p>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Senha</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  variant="professional"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
