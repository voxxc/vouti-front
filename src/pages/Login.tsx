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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-premium)' }}>
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
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-white text-gray-900 border-0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-white text-gray-900 border-0"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 mt-6"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="text-center space-y-2">
              <button className="text-sm text-gray-400 hover:text-mora-gold transition-colors">
                Esqueceu a senha?
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;