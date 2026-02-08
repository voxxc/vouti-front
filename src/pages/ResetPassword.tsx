import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [isProcessingToken, setIsProcessingToken] = useState(true);
  const { toast } = useToast();
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  
  // Try to get tenant context
  let tenant = null;
  let tenantSlug = 'solvenza';
  try {
    const tenantContext = useTenant();
    tenant = tenantContext.tenant;
    tenantSlug = tenantContext.tenantSlug || 'solvenza';
  } catch {
    // useTenant throws if not in TenantProvider
  }

  // Force dark theme
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

  // Process recovery tokens from URL hash
  useEffect(() => {
    const processRecoveryToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      console.log('[ResetPassword] Processing URL hash, type:', type);

      if (type === 'recovery' && accessToken && refreshToken) {
        console.log('[ResetPassword] Recovery tokens found, establishing session...');
        
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          console.error('[ResetPassword] Error establishing session:', error);
          toast({
            title: "Link inválido",
            description: "O link de recuperação expirou ou é inválido.",
            variant: "destructive",
          });
          navigate(`/${tenantSlug}/auth`);
        } else {
          console.log('[ResetPassword] Session established successfully');
          setSessionReady(true);
          // Clear hash from URL for security
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else {
        // Check if there's already a valid session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('[ResetPassword] Existing session found');
          setSessionReady(true);
        } else {
          console.log('[ResetPassword] No session found, redirecting...');
          toast({
            title: "Acesso não autorizado",
            description: "Use o link enviado para seu email.",
            variant: "destructive",
          });
          navigate(`/${tenantSlug}/auth`);
        }
      }
      
      setIsProcessingToken(false);
    };

    processRecoveryToken();
  }, [navigate, tenantSlug, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
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

    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await updatePassword(password);
      
      if (error) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao atualizar senha.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Senha atualizada",
          description: "Sua senha foi atualizada com sucesso.",
        });
        navigate(`/${tenantSlug}/auth`);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar senha.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while processing recovery token
  if (isProcessingToken) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Validando link de recuperação...</p>
        </div>
      </div>
    );
  }

  // Don't render form if session is not ready
  if (!sessionReady) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-10 w-2 h-2 rounded-full bg-primary animate-float opacity-60" />
        <div className="absolute bottom-1/3 right-20 w-3 h-3 rounded-full bg-accent animate-float opacity-40" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-primary animate-float opacity-50" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          {tenant && (
            <p className="text-sm text-muted-foreground mb-2">{tenant.name}</p>
          )}
          <Logo size="lg" className="justify-center mb-6" />
        </div>

        <Card className="shadow-card border-0">
          <CardHeader className="space-y-1 text-center pb-4">
            <h3 className="text-xl font-semibold text-foreground">Redefinir Senha</h3>
            <p className="text-sm text-muted-foreground">
              Digite sua nova senha
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                variant="professional"
                disabled={isLoading}
              >
                {isLoading ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
