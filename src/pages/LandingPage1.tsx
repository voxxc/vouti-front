import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Instagram, MessageCircle, CheckCircle2, Users, Shield, TrendingUp, ArrowRight, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

const LandingPage1 = () => {
  const { toast } = useToast();
  const { tenant, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    phoneConfirm: "",
    areaAtuacao: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [easterEggInput, setEasterEggInput] = useState("");

  const handleEasterEggSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = easterEggInput.toLowerCase();
      if (code === 'jusvouti') {
        await supabase.auth.signOut();
        navigate('/auth');
      } else if (code === 'metal') {
        await supabase.auth.signOut();
        navigate('/metal-auth');
      } else if (code === 'vlink') {
        await supabase.auth.signOut();
        navigate('/link-auth');
      } else if (code === 'adm1nvouti') {
        navigate('/super-admin');
      } else if (code === 'batink') {
        navigate('/batink');
      } else {
        setEasterEggInput('');
        setShowEasterEgg(false);
      }
    }
  };

  // Force light theme for landing page
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    
    return () => {
      // Restore theme when leaving
      const storedTheme = localStorage.getItem('theme') || 'dark';
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(storedTheme);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.phone !== formData.phoneConfirm) {
      toast({
        title: "Erro",
        description: "Os números de telefone não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name || !formData.phone) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('leads_captacao')
        .insert({
          nome: formData.name,
          email: formData.email || null,
          telefone: formData.phone,
          tipo: formData.areaAtuacao,
          status: 'captacao',
          prioridade: 'a definir',
          validado: formData.phone ? 'validado' : 'a definir',
          user_id: null,
          origem: 'landing_page_1',
          tenant_id: tenant?.id || null,
        });

      if (error) throw error;

      toast({
        title: "Formulário enviado!",
        description: "Entraremos em contato em breve.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        phoneConfirm: "",
        areaAtuacao: "",
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Erro ao enviar formulário",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-900">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-900">
      {/* Header with Social Links */}
      <header className="bg-emerald-950/50 py-3">
        <div className="container mx-auto px-4 flex justify-end gap-4">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">
            <Instagram className="h-5 w-5" />
          </a>
          <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">
            <MessageCircle className="h-5 w-5" />
          </a>
        </div>
      </header>

      {/* Hero Section with Video Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full">
          <iframe
            className="absolute top-1/2 left-1/2 w-[100vw] h-[100vh] min-w-[100vw] min-h-[100vh] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            src="https://www.youtube.com/embed/JlAKU98xcW4?autoplay=1&mute=1&loop=1&playlist=JlAKU98xcW4&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
            title="Background video"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            style={{ objectFit: 'cover' }}
          />
          <div className="absolute inset-0 bg-emerald-900/60 backdrop-blur-[2px]" />
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight drop-shadow-lg">
              Produtor, <span className="text-emerald-300">Dívidas Rurais</span> estão ameaçando o futuro do seu negócio?
            </h1>

            <p className="text-xl md:text-2xl text-white drop-shadow-lg">
              Com nossos serviços, você renegocia, reduz juros e retoma o controle da sua propriedade. 
              <strong className="block mt-2">Dívidas se negociam, sua terra se preserva!</strong>
            </p>

            <p className="text-lg text-emerald-200 font-semibold drop-shadow-lg">
              Preencha o formulário e fale com um especialista agora mesmo!
            </p>

            {/* Form */}
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl max-w-md mx-auto">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    placeholder="Digite seu nome"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-12"
                  />

                  <Input
                    type="email"
                    placeholder="Digite seu e-mail"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12"
                  />
                  
                  <Input
                    placeholder="Telefone com DDD"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="h-12"
                  />
                  
                  <Input
                    placeholder="Confirme seu Telefone com DDD"
                    value={formData.phoneConfirm}
                    onChange={(e) => setFormData({ ...formData, phoneConfirm: e.target.value })}
                    required
                    className="h-12"
                  />

                  <Select
                    value={formData.areaAtuacao}
                    onValueChange={(value) => setFormData({ ...formData, areaAtuacao: value })}
                    required
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Área de Atuação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agricultor">Agricultor</SelectItem>
                      <SelectItem value="produtor-rural">Produtor Rural</SelectItem>
                      <SelectItem value="pecuarista">Pecuarista</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg disabled:opacity-50"
                  >
                    {isSubmitting ? "ENVIANDO..." : "FALAR COM ESPECIALISTA AGORA!"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="bg-gradient-to-b from-amber-50 to-amber-100 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                  <span className="text-amber-600">Soluções reais</span> para quem vive do campo
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-1" />
                    <p className="text-lg text-gray-700">
                      Renegociação de dívidas com instituições financeiras
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-1" />
                    <p className="text-lg text-gray-700">
                      Redução de juros e prazos estendidos
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-1" />
                    <p className="text-lg text-gray-700">
                      Proteção do seu patrimônio rural
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-1" />
                    <p className="text-lg text-gray-700">
                      Planejamento financeiro especializado
                    </p>
                  </div>
                </div>

                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg">
                  Quero resolver minhas dívidas
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              <div className="relative">
                <div className="aspect-video bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl shadow-2xl flex items-center justify-center">
                  <div className="text-white text-center">
                    <TrendingUp className="h-24 w-24 mx-auto mb-4" />
                    <p className="text-xl font-semibold">Imagem ilustrativa</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-emerald-900 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
              Por que escolher nossos serviços?
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-colors">
                <CardContent className="p-8 text-center">
                  <Users className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Expertise no Setor
                  </h3>
                  <p className="text-white/80 text-lg">
                    Especialistas com anos de experiência no agronegócio
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-colors">
                <CardContent className="p-8 text-center">
                  <Shield className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Segurança Total
                  </h3>
                  <p className="text-white/80 text-lg">
                    Protegemos seus interesses e seu patrimônio
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-colors">
                <CardContent className="p-8 text-center">
                  <TrendingUp className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Resultados Comprovados
                  </h3>
                  <p className="text-white/80 text-lg">
                    Centenas de produtores já recuperaram o controle financeiro
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-b from-emerald-800 to-emerald-900 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Não deixe as dívidas tomarem sua propriedade
            </h2>
            <p className="text-xl text-white/90">
              Entre em contato hoje mesmo e descubra como podemos ajudar você a retomar o controle do seu negócio rural.
            </p>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white px-12 py-6 text-xl font-bold">
              FALAR COM ESPECIALISTA
              <MessageCircle className="ml-2 h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-950 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/60">
            © 2025 - Todos os direitos reservados
          </p>
        </div>
      </footer>

      {/* Easter Egg */}
      <button
        onClick={() => setShowEasterEgg(!showEasterEgg)}
        className="fixed bottom-4 right-4 w-8 h-8 opacity-0 hover:opacity-10 transition-opacity z-50"
        aria-label="Secret"
      >
        <KeyRound className="w-4 h-4 text-emerald-400" />
      </button>

      {showEasterEgg && (
        <div className="fixed bottom-16 right-4 z-50 animate-fade-in">
          <Input
            type="text"
            value={easterEggInput}
            onChange={(e) => setEasterEggInput(e.target.value)}
            onKeyDown={handleEasterEggSubmit}
            onBlur={() => {
              setTimeout(() => setShowEasterEgg(false), 200);
            }}
            placeholder="..."
            autoFocus
            className="w-32 h-8 text-sm backdrop-blur-md bg-emerald-950/90 border-emerald-500/50 text-white focus:ring-emerald-500"
          />
        </div>
      )}
    </div>
  );
};

export default LandingPage1;