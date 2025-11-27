import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Shield, Smartphone, Zap, ArrowRight, X, Mail, Phone, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const BatinkLanding = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cidade: '',
    funcionarios: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const heroAnimation = useScrollAnimation(0.1);
  const featuresAnimation = useScrollAnimation(0.1);
  const statsAnimation = useScrollAnimation(0.1);
  const ctaAnimation = useScrollAnimation(0.1);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.telefone || !formData.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha nome, telefone e email.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('leads_captacao')
        .insert({
          nome: formData.nome,
          telefone: formData.telefone,
          email: formData.email,
          origem: 'batink_landing',
          comentario: `Cidade: ${formData.cidade || 'Não informada'} | Funcionários: ${formData.funcionarios || 'Não informado'}`,
          status: 'novo',
          user_id: null
        });

      if (error) throw error;

      toast({
        title: "Solicitação enviada!",
        description: "Entraremos em contato em breve.",
      });
      
      setModalOpen(false);
      setFormData({ nome: '', telefone: '', email: '', cidade: '', funcionarios: '' });
    } catch (error) {
      console.error('Erro ao enviar lead:', error);
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: Smartphone,
      title: 'Mobile First',
      description: 'Registre o ponto de qualquer lugar com nosso app responsivo e intuitivo.'
    },
    {
      icon: Shield,
      title: 'Segurança Total',
      description: 'Dados criptografados e backup automático em nuvem com alta disponibilidade.'
    },
    {
      icon: Zap,
      title: 'Tempo Real',
      description: 'Acompanhe os registros instantaneamente com sincronização em tempo real.'
    }
  ];

  const stats = [
    { value: '1.000+', label: 'Empresas' },
    { value: '99.9%', label: 'Uptime' },
    { value: '50k+', label: 'Registros/dia' }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#8b5cf6]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#7c3aed]/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-[#d4af37]/5 rounded-full blur-[80px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Clock className="h-8 w-8 text-[#8b5cf6]" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#d4af37] rounded-full animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-[#8b5cf6]">BAT</span>
              <span className="text-white">INK</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setModalOpen(true)}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Contato
            </button>
            <Button 
              onClick={() => navigate('/batink/auth')}
              className="bg-transparent border border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/10 hover:border-[#d4af37] px-6"
            >
              Entrar
            </Button>
          </nav>

          <button 
            className="md:hidden text-white/80"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : (
              <div className="flex flex-col gap-1.5">
                <span className="w-6 h-0.5 bg-white/80" />
                <span className="w-6 h-0.5 bg-white/80" />
                <span className="w-6 h-0.5 bg-white/80" />
              </div>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/5 px-6 py-6 space-y-4">
            <button 
              onClick={() => { setModalOpen(true); setMobileMenuOpen(false); }}
              className="block w-full text-left text-white/60 hover:text-white transition-colors py-2"
            >
              Contato
            </button>
            <Button 
              onClick={() => navigate('/batink/auth')}
              className="w-full bg-[#d4af37] text-black hover:bg-[#d4af37]/90"
            >
              Entrar
            </Button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section 
        ref={heroAnimation.ref}
        className={`min-h-screen flex items-center justify-center relative pt-20 transition-all duration-1000 ${
          heroAnimation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8">
            <div className="w-2 h-2 bg-[#d4af37] rounded-full animate-pulse" />
            <span className="text-sm text-white/60">Sistema de Ponto Digital</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <span className="text-[#8b5cf6]">BATINK</span>
          </h1>
          
          <p className="text-2xl md:text-3xl lg:text-4xl font-light text-white/40 mb-4">
            Controle de Ponto
          </p>
          
          <p className="text-2xl md:text-3xl lg:text-4xl font-light mb-12">
            <span className="text-[#d4af37]">Inteligente</span>
          </p>
          
          <p className="text-lg text-white/50 max-w-xl mx-auto mb-12">
            Modernize a gestão de ponto da sua empresa com tecnologia de ponta, 
            segurança e simplicidade.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              onClick={() => setModalOpen(true)}
              className="relative bg-[#d4af37] text-black hover:bg-[#d4af37]/90 px-8 py-6 text-lg font-semibold group overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                Começar Agora
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37] to-[#f4d03f] opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => navigate('/batink/auth')}
              className="border-white/20 text-white hover:bg-white/5 px-8 py-6 text-lg"
            >
              Fazer Login
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </section>

      {/* Features Section */}
      <section 
        ref={featuresAnimation.ref}
        className={`py-32 relative transition-all duration-1000 delay-200 ${
          featuresAnimation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Por que escolher o <span className="text-[#8b5cf6]">BATINK</span>?
            </h2>
            <p className="text-white/50 max-w-lg mx-auto">
              Tecnologia avançada para simplificar o controle de ponto da sua empresa.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group relative bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-[#8b5cf6]/50 transition-all duration-500"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#8b5cf6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                
                <div className="relative">
                  <div className="w-14 h-14 bg-[#8b5cf6]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#8b5cf6]/20 transition-colors">
                    <feature.icon className="h-7 w-7 text-[#8b5cf6]" />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-white/50 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section 
        ref={statsAnimation.ref}
        className={`py-24 relative transition-all duration-1000 delay-300 ${
          statsAnimation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-5xl font-bold text-[#d4af37] mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-white/40 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        ref={ctaAnimation.ref}
        className={`py-32 relative transition-all duration-1000 delay-400 ${
          ctaAnimation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Pronto para <span className="text-[#8b5cf6]">modernizar</span>
            <br />
            sua gestão de ponto?
          </h2>
          
          <p className="text-lg text-white/50 mb-10 max-w-lg mx-auto">
            Junte-se a milhares de empresas que já transformaram seu controle de ponto.
          </p>

          <Button 
            onClick={() => setModalOpen(true)}
            className="bg-[#d4af37] text-black hover:bg-[#d4af37]/90 px-10 py-6 text-lg font-semibold"
          >
            Solicitar Demonstração
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#8b5cf6]" />
            <span className="text-sm text-white/40">BATINK</span>
          </div>
          <p className="text-sm text-white/30">
            © {new Date().getFullYear()} BATINK. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Contact Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#0f0f15] border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-3">
              <div className="w-10 h-10 bg-[#8b5cf6]/20 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-[#8b5cf6]" />
              </div>
              Solicitar Contato
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Nome *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Seu nome completo"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 focus:border-[#8b5cf6]/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Telefone *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  placeholder="(00) 00000-0000"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 focus:border-[#8b5cf6]/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="seu@email.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 focus:border-[#8b5cf6]/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Cidade</Label>
                <Input
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleInputChange}
                  placeholder="Sua cidade"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#8b5cf6]/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Funcionários</Label>
                <Input
                  name="funcionarios"
                  value={formData.funcionarios}
                  onChange={handleInputChange}
                  placeholder="Quantidade"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#8b5cf6]/50"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-[#d4af37] text-black hover:bg-[#d4af37]/90 py-6 font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Solicitação'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatinkLanding;
