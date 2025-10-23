import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLinkAuth } from "@/contexts/LinkAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import LoadingTransition from "@/components/LoadingTransition";

const LinkAuth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useLinkAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showTransition, setShowTransition] = useState(false);

  // Sign in states
  const [signInUsername, setSignInUsername] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign up states
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpFullName, setSignUpFullName] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/link-dashboard");
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signInUsername || !signInPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(signInUsername, signInPassword);
      
      if (error) {
        toast.error(error.message || "Erro ao fazer login");
      } else {
        setShowTransition(true);
        setTimeout(() => {
          navigate("/link-dashboard");
        }, 500);
      }
    } catch (error) {
      toast.error("Erro inesperado ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signUpUsername || !signUpPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(signUpUsername)) {
      toast.error("Username deve conter apenas letras, números e underscore");
      return;
    }

    if (signUpPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(signUpUsername, signUpPassword, signUpFullName);
      
      if (error) {
        toast.error(error.message || "Erro ao criar conta");
      } else {
        toast.success("Conta criada! Fazendo login...");
        
        // Auto-login após cadastro bem-sucedido
        const { error: signInError } = await signIn(signUpUsername, signUpPassword);
        
        if (signInError) {
          toast.error("Conta criada, mas erro ao fazer login. Tente fazer login manualmente.");
        } else {
          setShowTransition(true);
          setTimeout(() => {
            navigate("/link-dashboard");
          }, 500);
        }
      }
    } catch (error) {
      toast.error("Erro inesperado ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  if (showTransition) {
    return <LoadingTransition onComplete={() => {}} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="absolute inset-0 bg-grid-white/[0.02] -z-10" />
      
      <Card className="w-full max-w-md backdrop-blur-sm bg-card/95 border-border/50 shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Link2 className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl text-center font-bold bg-gradient-to-r from-[hsl(var(--vouti-purple))] to-[hsl(var(--vouti-purple-light))] bg-clip-text text-transparent">
            Vouti
          </CardTitle>
          <CardDescription className="text-center text-base">
            Sistema de Links na Bio
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
                  <Label htmlFor="signin-username">Username</Label>
                  <Input
                    id="signin-username"
                    type="text"
                    placeholder="seu_username"
                    value={signInUsername}
                    onChange={(e) => setSignInUsername(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Senha</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="seu_username"
                    value={signUpUsername}
                    onChange={(e) => setSignUpUsername(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo (opcional)</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    value={signUpFullName}
                    onChange={(e) => setSignUpFullName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default LinkAuth;
