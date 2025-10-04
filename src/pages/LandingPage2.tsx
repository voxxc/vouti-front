import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Brain, Code, TrendingUp, Target, Zap, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LandingPage2 = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
    };
    fetchUser();
  }, []);

  const handleEbookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !name) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha seu nome e e-mail",
        variant: "destructive",
      });
      return;
    }

    // Get or use a default user ID for anonymous leads
    let userId = currentUserId;
    if (!userId) {
      // For anonymous submissions, we'll create a generic system user ID
      // In production, you should have a dedicated system user for this
      const { data: { user: anonUser } } = await supabase.auth.getUser();
      userId = anonUser?.id || "00000000-0000-0000-0000-000000000000";
    }

    try {
      const { error } = await supabase
        .from("leads_captacao")
        .insert({ 
          nome: name,
          email: email,
          telefone: "",
          tipo: "E-book",
          status: "captacao",
          prioridade: "a definir",
          validado: "a definir",
          origem: "landing_page_2",
          user_id: userId
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "E-book enviado para seu e-mail!",
      });
      setEmail("");
      setName("");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              DE MORAIS<span className="text-primary">.</span>
            </h1>
            <Button variant="ghost" size="sm">Menu</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
        {/* Animated background dots */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-2 h-2 bg-primary rounded-full animate-pulse" />
          <div className="absolute top-40 right-20 w-2 h-2 bg-accent rounded-full animate-pulse delay-100" />
          <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-primary rounded-full animate-pulse delay-200" />
          <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-accent rounded-full animate-pulse delay-300" />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Premium Growth Solutions</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Escale Seu<br />
            <span className="text-primary">Negócio</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
            Tecnologia de ponta e estratégias data-driven para empresas que buscam crescimento exponencial
          </p>

          <Button size="lg" className="text-lg px-8 py-6">
            START
            <Sparkles className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Soluções Completas</h2>
            <p className="text-xl text-muted-foreground">
              Tudo que você precisa para dominar seu mercado
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "IA & Automação",
                description: "Inteligência artificial trabalhando 24/7 pelo seu negócio"
              },
              {
                icon: Code,
                title: "Desenvolvimento",
                description: "Sistemas escaláveis e robustos sob medida"
              },
              {
                icon: TrendingUp,
                title: "Growth Marketing",
                description: "Crescimento acelerado com dados e estratégia"
              },
              {
                icon: Target,
                title: "Tráfego Pago",
                description: "ROI otimizado em todas as campanhas"
              },
              {
                icon: Users,
                title: "Consultoria",
                description: "Estratégia personalizada para seu mercado"
              },
              {
                icon: Zap,
                title: "Otimização",
                description: "Processos enxutos e alta performance"
              }
            ].map((solution, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <solution.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">{solution.title}</h3>
                <p className="text-muted-foreground">{solution.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Processo Simples</h2>
            <p className="text-xl text-muted-foreground">
              Do primeiro contato aos resultados extraordinários
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                number: "01",
                title: "Análise",
                description: "Entendemos seu negócio, desafios e objetivos"
              },
              {
                number: "02",
                title: "Estratégia",
                description: "Criamos um plano personalizado de crescimento"
              },
              {
                number: "03",
                title: "Execução",
                description: "Implementamos as soluções com excelência"
              },
              {
                number: "04",
                title: "Otimização",
                description: "Medimos, ajustamos e escalamos resultados"
              }
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="text-6xl font-bold text-primary/20 mb-4">{step.number}</div>
                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Pronto Para <span className="text-primary">Decolar?</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* E-book Card */}
              <Card className="p-8">
                <h3 className="text-2xl font-bold mb-4">E-book Gratuito</h3>
                <p className="text-lg font-semibold mb-2">10 Erros de Gestão que Impedem o Crescimento</p>
                <p className="text-muted-foreground mb-6">
                  Descubra os erros mais comuns que travam o crescimento das empresas e como evitá-los. 
                  Preencha o formulário abaixo para receber.
                </p>

                <form onSubmit={handleEbookSubmit} className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full"
                  />
                  <Input
                    type="email"
                    placeholder="Seu melhor e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full"
                  />
                  <Button type="submit" className="w-full" size="lg">
                    Receber E-book Grátis
                  </Button>
                </form>
              </Card>

              {/* Consultation Card */}
              <Card className="p-8 bg-primary text-primary-foreground">
                <h3 className="text-2xl font-bold mb-4">Reunião Estratégica</h3>
                <p className="mb-8 opacity-90">
                  Agende uma reunião estratégica gratuita e descubra como multiplicar seus resultados
                </p>
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="w-full"
                >
                  Agendar Agora
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 DE MORAIS. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage2;
