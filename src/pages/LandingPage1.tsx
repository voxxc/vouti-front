import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Instagram, MessageCircle, CheckCircle2, Users, Shield, TrendingUp, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LandingPage1 = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    phoneConfirm: "",
    areaAtuacao: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.phone !== formData.phoneConfirm) {
      toast({
        title: "Erro",
        description: "Os números de telefone não coincidem",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Formulário enviado!",
      description: "Entraremos em contato em breve.",
    });

    // Reset form
    setFormData({
      name: "",
      phone: "",
      phoneConfirm: "",
      areaAtuacao: "",
    });
  };

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
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg"
                  >
                    FALAR COM ESPECIALISTA AGORA!
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
    </div>
  );
};

export default LandingPage1;
