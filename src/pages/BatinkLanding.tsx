import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Fingerprint, Clock, Zap, Shield, Menu, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const BatinkLanding = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cidade: '',
    funcionarios: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        comentario: formData.funcionarios ? `Funcionários: ${formData.funcionarios}` : null,
        origem: 'batink_landing',
        status: 'captacao',
      });

      if (error) throw error;

      toast({
        title: "Mensagem enviada!",
        description: "Em breve entraremos em contato.",
      });
      
      setModalOpen(false);
      setFormData({ nome: '', telefone: '', email: '', cidade: '', funcionarios: '' });
    } catch (error) {
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
      icon: Clock,
      title: 'Registro Rápido',
      description: 'Bata o ponto em segundos, direto do celular ou computador.',
    },
    {
      icon: Zap,
      title: 'Dados em Tempo Real',
      description: 'Acompanhe a jornada da sua equipe instantaneamente.',
    },
    {
      icon: Shield,
      title: 'Segurança Total',
      description: 'Seus dados protegidos com a mais alta tecnologia.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-white/10">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/batink" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ec4899] to-[#db2777] blur-sm opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative bg-gradient-to-br from-[#ec4899] to-[#db2777] p-2 rounded-lg">
                <Fingerprint className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-xl text-white">BATINK</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#facc15] animate-pulse" />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setModalOpen(true)}
            >
              Contato
            </Button>
            <Link to="/batink/auth">
              <Button className="bg-[#facc15] text-[#0a0a0b] hover:bg-[#eab308] rounded-full font-semibold shadow-lg shadow-[#facc15]/20">
                Entrar
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0a0b] border-b border-white/10 py-4 px-4 space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => {
                setModalOpen(true);
                setMobileMenuOpen(false);
              }}
            >
              Contato
            </Button>
            <Link to="/batink/auth" className="block">
              <Button className="w-full bg-[#facc15] text-[#0a0a0b] hover:bg-[#eab308] rounded-full font-semibold">
                Entrar
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="text-[#ec4899]">BATINK</span>
            <br />
            <span className="text-white">Gestão de Ponto</span>
            <br />
            <span className="text-[#facc15]">Digital</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-md mx-auto">
            O ponto certo para sua equipe.
          </p>
          <Button
            size="lg"
            className="bg-[#facc15] text-[#0a0a0b] hover:bg-[#eab308] rounded-full px-8 py-6 text-lg font-semibold shadow-lg shadow-[#facc15]/25 hover:shadow-xl hover:shadow-[#facc15]/30 transition-all"
            onClick={() => setModalOpen(true)}
          >
            Começar Agora
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/[0.02]">
        <div className="container mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Por que escolher o <span className="text-[#ec4899]">BATINK</span>?
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/[0.06] hover:border-[#ec4899]/30 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-[#ec4899]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#ec4899]/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-[#ec4899]" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  {feature.title}
                </h3>
                <p className="text-white/50">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-white">
            Pronto para começar?
          </h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto">
            Simplifique o controle de ponto da sua empresa hoje mesmo.
          </p>
          <Button
            size="lg"
            className="bg-[#facc15] text-[#0a0a0b] hover:bg-[#eab308] rounded-full px-8 py-6 text-lg font-semibold shadow-lg shadow-[#facc15]/25 hover:shadow-xl hover:shadow-[#facc15]/30 transition-all"
            onClick={() => setModalOpen(true)}
          >
            Falar com um Especialista
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="container mx-auto text-center text-sm text-white/40">
          © {new Date().getFullYear()} BATINK. Todos os direitos reservados.
        </div>
      </footer>

      {/* Contact Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#141416] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Fingerprint className="w-5 h-5 text-[#ec4899]" />
              Solicitar Demonstração
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Preencha seus dados e entraremos em contato.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-white/70">Nome completo *</Label>
              <Input
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                placeholder="Seu nome"
                className="bg-[#0a0a0b] border-white/20 text-white placeholder:text-white/30 focus:border-[#ec4899]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone" className="text-white/70">Telefone *</Label>
              <Input
                id="telefone"
                name="telefone"
                value={formData.telefone}
                onChange={handleInputChange}
                placeholder="(00) 00000-0000"
                className="bg-[#0a0a0b] border-white/20 text-white placeholder:text-white/30 focus:border-[#ec4899]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="seu@email.com"
                className="bg-[#0a0a0b] border-white/20 text-white placeholder:text-white/30 focus:border-[#ec4899]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade" className="text-white/70">Cidade</Label>
              <Input
                id="cidade"
                name="cidade"
                value={formData.cidade}
                onChange={handleInputChange}
                placeholder="Sua cidade"
                className="bg-[#0a0a0b] border-white/20 text-white placeholder:text-white/30 focus:border-[#ec4899]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="funcionarios" className="text-white/70">Quantidade de funcionários</Label>
              <Input
                id="funcionarios"
                name="funcionarios"
                value={formData.funcionarios}
                onChange={handleInputChange}
                placeholder="Ex: 10"
                className="bg-[#0a0a0b] border-white/20 text-white placeholder:text-white/30 focus:border-[#ec4899]"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#facc15] text-[#0a0a0b] hover:bg-[#eab308] rounded-full font-semibold"
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
