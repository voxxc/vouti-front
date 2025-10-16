import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Scale, Users, Shield, Award, Phone, Mail, MapPin, Facebook, Instagram, Linkedin, Menu, X, CheckCircle, FileText, Home as HomeIcon, Briefcase, Heart, Building, Coins, Key, Calendar, ShoppingCart } from 'lucide-react';
import heroImage from '@/assets/hero-law-office.jpg';
import advogado1 from '@/assets/advogado-1.jpg';
import advogado2 from '@/assets/advogado-2.jpg';
import advogado3 from '@/assets/advogado-3.jpg';
import advogado4 from '@/assets/advogado-4.jpg';

const LandingPage2 = () => {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    area: '',
    mensagem: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    
    return () => {
      const storedTheme = localStorage.getItem('theme') || 'dark';
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(storedTheme);
    };
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email || !formData.telefone || !formData.area) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para enviar o formulário.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('leads_captacao').insert({
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        tipo: formData.area,
        comentario: formData.mensagem,
        origem: 'landing_page_3',
        user_id: user.id
      });

      if (error) throw error;

      toast({
        title: "Mensagem enviada!",
        description: "Entraremos em contato em breve.",
      });

      setFormData({
        nome: '',
        email: '',
        telefone: '',
        area: '',
        mensagem: ''
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro ao enviar sua mensagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const areasAtuacao = [
    { icon: Scale, title: "Direito Civil", desc: "Assessoria completa em contratos, responsabilidade civil e disputas patrimoniais." },
    { icon: Briefcase, title: "Direito Trabalhista", desc: "Defesa de direitos trabalhistas, rescisões e processos contra empregadores." },
    { icon: Heart, title: "Direito de Família", desc: "Divórcio, pensão alimentícia, guarda de filhos e inventários." },
    { icon: Building, title: "Direito Empresarial", desc: "Consultoria jurídica para empresas, contratos e recuperação judicial." },
    { icon: Coins, title: "Direito Tributário", desc: "Planejamento tributário, restituição de impostos e defesas fiscais." },
    { icon: Key, title: "Direito Imobiliário", desc: "Compra e venda de imóveis, regularização e usucapião." },
    { icon: Calendar, title: "Direito Previdenciário", desc: "Aposentadorias, pensões, auxílios e benefícios do INSS." },
    { icon: ShoppingCart, title: "Direito do Consumidor", desc: "Defesa de direitos do consumidor, indenizações e recalls." }
  ];

  const equipe = [
    { image: advogado1, nome: "ADVOGADO 1", oab: "OAB/SP 123.456", especialidade: "Direito Civil e Família" },
    { image: advogado2, nome: "ADVOGADO 2", oab: "OAB/SP 234.567", especialidade: "Direito Trabalhista" },
    { image: advogado3, nome: "ADVOGADO 3", oab: "OAB/SP 345.678", especialidade: "Direito Empresarial" },
    { image: advogado4, nome: "ADVOGADO 4", oab: "OAB/SP 456.789", especialidade: "Direito Tributário" }
  ];

  const diferenciais = [
    { icon: Users, title: "Atendimento Personalizado", desc: "Cada caso é único e merece atenção exclusiva." },
    { icon: Award, title: "Equipe Especializada", desc: "Advogados experientes e altamente qualificados." },
    { icon: Shield, title: "Transparência Total", desc: "Comunicação clara e acompanhamento constante." },
    { icon: CheckCircle, title: "Resultados Comprovados", desc: "Histórico de sucesso em milhares de casos." }
  ];

  const metricas = [
    { numero: "+500", label: "Clientes Atendidos" },
    { numero: "+15", label: "Anos de Experiência" },
    { numero: "98%", label: "Taxa de Sucesso" },
    { numero: "+1000", label: "Processos Concluídos" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header Fixo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-2">
              <Scale className="h-8 w-8 text-[#1e3a5f]" />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-[#1e3a5f]">MORA</span>
                <span className="text-xs text-[#d4af37]">ADVOGADOS ASSOCIADOS</span>
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollToSection('inicio')} className="text-sm font-medium hover:text-[#1e3a5f] transition-colors">
                Início
              </button>
              <button onClick={() => scrollToSection('sobre')} className="text-sm font-medium hover:text-[#1e3a5f] transition-colors">
                Sobre
              </button>
              <button onClick={() => scrollToSection('areas')} className="text-sm font-medium hover:text-[#1e3a5f] transition-colors">
                Áreas
              </button>
              <button onClick={() => scrollToSection('equipe')} className="text-sm font-medium hover:text-[#1e3a5f] transition-colors">
                Equipe
              </button>
              <button onClick={() => scrollToSection('contato')} className="text-sm font-medium hover:text-[#1e3a5f] transition-colors">
                Contato
              </button>
              <Button onClick={() => scrollToSection('contato')} className="bg-[#d4af37] hover:bg-[#b8962f] text-white">
                Fale Conosco
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <nav className="flex flex-col gap-3">
                <button onClick={() => scrollToSection('inicio')} className="text-sm font-medium hover:text-[#1e3a5f] transition-colors text-left">
                  Início
                </button>
                <button onClick={() => scrollToSection('sobre')} className="text-sm font-medium hover:text-[#1e3a5f] transition-colors text-left">
                  Sobre
                </button>
                <button onClick={() => scrollToSection('areas')} className="text-sm font-medium hover:text-[#1e3a5f] transition-colors text-left">
                  Áreas
                </button>
                <button onClick={() => scrollToSection('equipe')} className="text-sm font-medium hover:text-[#1e3a5f] transition-colors text-left">
                  Equipe
                </button>
                <button onClick={() => scrollToSection('contato')} className="text-sm font-medium hover:text-[#1e3a5f] transition-colors text-left">
                  Contato
                </button>
                <Button onClick={() => scrollToSection('contato')} className="bg-[#d4af37] hover:bg-[#b8962f] text-white w-full">
                  Fale Conosco
                </Button>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="relative h-screen flex items-center justify-center" style={{ marginTop: '80px' }}>
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#1e3a5f]/90 to-[#1e3a5f]/70"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Tradição, Excelência e<br />Compromisso com a Justiça
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-gray-200">
            Há mais de 15 anos protegendo seus direitos com ética e competência
          </p>
          <Button 
            onClick={() => scrollToSection('contato')} 
            size="lg"
            className="bg-[#d4af37] hover:bg-[#b8962f] text-white text-lg px-8 py-6"
          >
            Agende uma Consulta
          </Button>
        </div>
      </section>

      {/* Sobre Nós */}
      <section id="sobre" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#1e3a5f] mb-4">Sobre Nós</h2>
            <div className="w-24 h-1 bg-[#d4af37] mx-auto mb-6"></div>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              O escritório MORA - Advogados Associados nasceu com o propósito de oferecer serviços jurídicos de excelência, 
              pautados na ética, transparência e compromisso com os resultados. Nossa equipe multidisciplinar está preparada 
              para atender demandas de pessoas físicas e jurídicas nas mais diversas áreas do Direito.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {metricas.map((metrica, index) => (
              <Card key={index} className="text-center border-2 border-[#d4af37]/20 hover:border-[#d4af37] transition-colors">
                <CardContent className="p-6">
                  <div className="text-4xl font-bold text-[#1e3a5f] mb-2">{metrica.numero}</div>
                  <div className="text-sm text-gray-600 font-medium">{metrica.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Áreas de Atuação */}
      <section id="areas" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#1e3a5f] mb-4">Áreas de Atuação</h2>
            <div className="w-24 h-1 bg-[#d4af37] mx-auto mb-6"></div>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              Oferecemos serviços especializados em diversas áreas do direito, sempre com foco em resultados efetivos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {areasAtuacao.map((area, index) => (
              <Card key={index} className="hover:border-[#1e3a5f] transition-all hover:shadow-lg">
                <CardContent className="p-6 text-center">
                  <area.icon className="h-12 w-12 mx-auto mb-4 text-[#d4af37]" />
                  <h3 className="text-lg font-bold text-[#1e3a5f] mb-2">{area.title}</h3>
                  <p className="text-sm text-gray-600">{area.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Nossa Equipe */}
      <section id="equipe" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#1e3a5f] mb-4">Nossa Equipe</h2>
            <div className="w-24 h-1 bg-[#d4af37] mx-auto mb-6"></div>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              Profissionais altamente qualificados e comprometidos com a excelência jurídica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {equipe.map((membro, index) => (
              <Card key={index} className="text-center hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <Avatar className="h-32 w-32 mx-auto mb-4 border-4 border-[#d4af37]">
                    <AvatarImage src={membro.image} alt={membro.nome} />
                    <AvatarFallback>A{index + 1}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-1">{membro.nome}</h3>
                  <p className="text-sm text-gray-600 mb-2">{membro.oab}</p>
                  <p className="text-sm text-[#d4af37] font-medium">{membro.especialidade}</p>
                  <Button variant="outline" className="mt-4 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white">
                    Ver Perfil
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="py-20 bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8f] text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Por Que Escolher a MORA?</h2>
            <div className="w-24 h-1 bg-[#d4af37] mx-auto mb-6"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {diferenciais.map((diferencial, index) => (
              <div key={index} className="text-center">
                <diferencial.icon className="h-16 w-16 mx-auto mb-4 text-[#d4af37]" />
                <h3 className="text-xl font-bold mb-2">{diferencial.title}</h3>
                <p className="text-gray-200">{diferencial.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formulário de Contato */}
      <section id="contato" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-[#1e3a5f] mb-4">Entre em Contato</h2>
              <div className="w-24 h-1 bg-[#d4af37] mx-auto mb-6"></div>
              <p className="text-lg text-gray-700">
                Preencha o formulário abaixo e nossa equipe entrará em contato em breve.
              </p>
            </div>

            <Card className="shadow-xl">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="nome">Nome Completo *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Seu nome completo"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="telefone">Telefone *</Label>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="area">Área de Interesse *</Label>
                      <Select value={formData.area} onValueChange={(value) => setFormData({ ...formData, area: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma área" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="civil">Direito Civil</SelectItem>
                          <SelectItem value="trabalhista">Direito Trabalhista</SelectItem>
                          <SelectItem value="familia">Direito de Família</SelectItem>
                          <SelectItem value="empresarial">Direito Empresarial</SelectItem>
                          <SelectItem value="tributario">Direito Tributário</SelectItem>
                          <SelectItem value="imobiliario">Direito Imobiliário</SelectItem>
                          <SelectItem value="previdenciario">Direito Previdenciário</SelectItem>
                          <SelectItem value="consumidor">Direito do Consumidor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="mensagem">Mensagem</Label>
                    <Textarea
                      id="mensagem"
                      value={formData.mensagem}
                      onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                      placeholder="Descreva brevemente seu caso..."
                      rows={5}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#d4af37] hover:bg-[#b8962f] text-white text-lg py-6"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1e3a5f] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-8 w-8 text-[#d4af37]" />
                <div className="flex flex-col">
                  <span className="text-xl font-bold">MORA</span>
                  <span className="text-xs text-[#d4af37]">ADVOGADOS ASSOCIADOS</span>
                </div>
              </div>
              <p className="text-gray-300 text-sm">
                Tradição, excelência e compromisso com a justiça desde 2009.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 text-[#d4af37]">Contato</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#d4af37]" />
                  <span>Av. Paulista, 1000 - São Paulo/SP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#d4af37]" />
                  <span>(11) 3000-0000</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#d4af37]" />
                  <span>contato@moraadvogados.com.br</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 text-[#d4af37]">Redes Sociais</h3>
              <div className="flex gap-4">
                <a href="#" className="hover:text-[#d4af37] transition-colors">
                  <Facebook className="h-6 w-6" />
                </a>
                <a href="#" className="hover:text-[#d4af37] transition-colors">
                  <Instagram className="h-6 w-6" />
                </a>
                <a href="#" className="hover:text-[#d4af37] transition-colors">
                  <Linkedin className="h-6 w-6" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} MORA - Advogados Associados. Todos os direitos reservados.</p>
            <p className="mt-2">OAB/SP 12.345 | CNPJ: 00.000.000/0001-00</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage2;
