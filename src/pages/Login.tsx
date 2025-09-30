import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";

interface LoginProps {
  onLogin: (email: string, password: string) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
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
    
    // Simulando autenticação (substituir por integração real)
    setTimeout(() => {
      if (email === "admin@escritorio.com" && password === "123456") {
        toast({
          title: "Sucesso",
          description: "Login realizado com sucesso!",
        });
        onLogin(email, password);
      } else {
        toast({
          title: "Erro",
          description: "Credenciais inválidas.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mb-8">
            <Logo size="lg" />
          </div>
        </div>

        <Card className="shadow-card border-0 bg-mora-card">
          <CardHeader className="space-y-1 text-center pb-6">
            <h3 className="text-xl font-semibold text-foreground">Acesso ao Sistema</h3>
            <p className="text-sm text-muted-foreground">
              Entre ou crie sua conta para continuar
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-input border-border text-foreground"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-input border-border text-foreground"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-mora-blue hover:bg-mora-blue-dark text-white font-medium py-3 mt-6"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="text-center space-y-2">
              <button className="text-sm text-muted-foreground hover:text-mora-blue transition-colors">
                Esqueceu a senha?
              </button>
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  Demo: admin@escritorio.com / 123456
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;