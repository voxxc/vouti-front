import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Shield, Zap, Target, Menu, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const BatinkLanding = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cidade: '',
    numFuncionarios: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.telefone) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha nome e telefone.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from('leads_captacao').insert({
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email || null,
        uf: formData.cidade || null,
        comentario: formData.numFuncionarios ? `Número de funcionários: ${formData.numFuncionarios}` : null,
        origem: 'batink_landing',
        status: 'captacao',
      });

      if (error) throw error;

      toast({
        title: "Mensagem enviada!",
        description: "Em breve um especialista entrará em contato.",
      });
      
      setModalOpen(false);
      setFormData({ nome: '', telefone: '', email: '', cidade: '', numFuncionarios: '' });
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: Target,
      title: 'Precisão',
      description: 'Registro preciso de ponto com geolocalização e reconhecimento facial.',
    },
    {
      icon: Zap,
      title: 'Agilidade',
      description: 'Sistema rápido e intuitivo para registro de ponto em segundos.',
    },
    {
      icon: Shield,
      title: 'Segurança',
      description: 'Dados criptografados e em conformidade com a LGPD.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#1a1625] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a1625]/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#9333EA] to-[#7C3AED] flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">BATINK</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Button 
              variant="ghost" 
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setModalOpen(true)}
            >
              Começar
            </Button>
            <Button 
              className="bg-[#9333EA] hover:bg-[#7C3AED] text-white"
              onClick={() => navigate('/batink/auth')}
            >
              Entrar
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#1a1625] border-t border-white/10 px-4 py-4 space-y-3">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => { setModalOpen(true); setMobileMenuOpen(false); }}
            >
              Começar
            </Button>
            <Button 
              className="w-full bg-[#9333EA] hover:bg-[#7C3AED] text-white"
              onClick={() => navigate('/batink/auth')}
            >
              Entrar
            </Button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="text-[#facc15]">Ponto Digital</span>
            </h1>
            <h2 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-[#9333EA] to-[#EC4899] bg-clip-text text-transparent">
              Batink
            </h2>
            <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto">
              Sistema de ponto com diversas funcionalidades para sua empresa. 
              Gerencie a jornada de trabalho de forma simples e eficiente.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                variant="outline"
                className="border-[#9333EA] text-[#9333EA] hover:bg-[#9333EA] hover:text-white bg-transparent"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Saiba Mais
              </Button>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-[#9333EA] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white shadow-lg shadow-[#9333EA]/30"
                onClick={() => setModalOpen(true)}
              >
                Falar com Especialista
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-[#2d2640]/50">
        <div className="container mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Por que escolher o <span className="text-[#9333EA]">BATINK</span>?
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-[#2d2640] rounded-2xl p-8 border border-white/10 hover:border-[#9333EA]/50 transition-all duration-300 hover:transform hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#9333EA]/20 to-[#EC4899]/20 flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-[#9333EA]" />
                </div>
                <h4 className="text-xl font-bold mb-3 text-[#facc15]">{feature.title}</h4>
                <p className="text-white/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-[#9333EA]/20 to-[#2d2640] rounded-3xl p-10 border border-[#9333EA]/30">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Comece hoje mesmo!
            </h3>
            <p className="text-white/60 mb-8">
              Transforme a gestão de ponto da sua empresa com o BATINK.
            </p>
            <Button 
              size="lg"
              className="bg-[#facc15] hover:bg-[#eab308] text-[#1a1625] font-bold shadow-lg shadow-[#facc15]/20"
              onClick={() => setModalOpen(true)}
            >
              Começar Agora
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="container mx-auto text-center text-white/40 text-sm">
          © {new Date().getFullYear()} BATINK. Todos os direitos reservados.
        </div>
      </footer>

      {/* Lead Capture Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#2d2640] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              Fale com um <span className="text-[#9333EA]">Especialista</span>
            </DialogTitle>
            <DialogDescription className="text-white/60 text-center">
              Preencha o formulário e entraremos em contato.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitLead} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-white/80">Nome completo *</Label>
              <Input
                id="nome"
                placeholder="Seu nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                className="bg-[#1a1625] border-white/20 text-white placeholder:text-white/40 focus:border-[#9333EA]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="telefone" className="text-white/80">Telefone *</Label>
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                className="bg-[#1a1625] border-white/20 text-white placeholder:text-white/40 focus:border-[#9333EA]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="bg-[#1a1625] border-white/20 text-white placeholder:text-white/40 focus:border-[#9333EA]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cidade" className="text-white/80">Cidade</Label>
              <Input
                id="cidade"
                placeholder="Sua cidade"
                value={formData.cidade}
                onChange={(e) => handleInputChange('cidade', e.target.value)}
                className="bg-[#1a1625] border-white/20 text-white placeholder:text-white/40 focus:border-[#9333EA]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="numFuncionarios" className="text-white/80">Número de funcionários</Label>
              <Select value={formData.numFuncionarios} onValueChange={(value) => handleInputChange('numFuncionarios', value)}>
                <SelectTrigger className="bg-[#1a1625] border-white/20 text-white focus:ring-[#9333EA]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#2d2640] border-white/20">
                  <SelectItem value="1-10" className="text-white hover:bg-[#9333EA]/20">1-10</SelectItem>
                  <SelectItem value="11-50" className="text-white hover:bg-[#9333EA]/20">11-50</SelectItem>
                  <SelectItem value="51-100" className="text-white hover:bg-[#9333EA]/20">51-100</SelectItem>
                  <SelectItem value="101-500" className="text-white hover:bg-[#9333EA]/20">101-500</SelectItem>
                  <SelectItem value="500+" className="text-white hover:bg-[#9333EA]/20">500+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-[#9333EA] hover:bg-[#7C3AED] text-white mt-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatinkLanding;
