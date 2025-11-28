import { Scale, Shield, FileText, Users, Briefcase, Clock, TrendingUp, Award, Target, BarChart3, X, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Background images
import heroBg from '@/assets/veridicto-hero-bg.jpg';
import libraryBg from '@/assets/veridicto-library-bg.jpg';
import tribunalBg from '@/assets/veridicto-tribunal-bg.jpg';
import cityBg from '@/assets/veridicto-city-bg.jpg';

// Floating particles component
const FloatingParticles = ({ count = 30, color = 'gold' }: { count?: number; color?: string }) => {
  const particles = [...Array(count)].map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 8 + Math.random() * 12,
    size: 2 + Math.random() * 4,
    opacity: 0.1 + Math.random() * 0.4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.left}%`,
            bottom: '-10px',
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: color === 'gold' 
              ? `radial-gradient(circle, rgba(212,175,55,${particle.opacity}) 0%, transparent 70%)`
              : `radial-gradient(circle, rgba(255,255,255,${particle.opacity}) 0%, transparent 70%)`,
            animation: `floatUp ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

const VeridictoLanding = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [easterEggInput, setEasterEggInput] = useState("");
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    celular: '',
    colaboradores: '',
    processos: ''
  });

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
      } else if (code === 'veridicto') {
        navigate('/veridicto');
      } else {
        setEasterEggInput('');
        setShowEasterEgg(false);
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email || !formData.celular) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha nome, email e celular.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const comentario = `Colaboradores: ${formData.colaboradores || 'Não informado'} | Processos: ${formData.processos || 'Não informado'}`;
      
      const { error } = await supabase
        .from('leads_captacao')
        .insert({
          nome: formData.nome,
          email: formData.email,
          telefone: formData.celular,
          origem: 'veridicto_landing',
          tipo: 'demonstracao',
          comentario: comentario,
          status: 'captacao'
        });

      if (error) throw error;

      toast({
        title: "Solicitação enviada!",
        description: "Nossa equipe entrará em contato em breve.",
      });

      setFormData({ nome: '', email: '', celular: '', colaboradores: '', processos: '' });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(0,0%,3%)] text-white overflow-x-hidden">
      {/* CSS for animations */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(212,175,55,0.3); }
          50% { box-shadow: 0 0 40px rgba(212,175,55,0.6); }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        .animate-delay-100 { animation-delay: 0.1s; }
        .animate-delay-200 { animation-delay: 0.2s; }
        .animate-delay-300 { animation-delay: 0.3s; }
        .animate-delay-400 { animation-delay: 0.4s; }
        .gold-gradient {
          background: linear-gradient(135deg, #d4af37 0%, #f4e5a3 50%, #d4af37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .shimmer-btn {
          background: linear-gradient(90deg, #d4af37 0%, #f4e5a3 25%, #d4af37 50%, #f4e5a3 75%, #d4af37 100%);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* Header - Ultra Minimalist */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/30">
        <div className="w-full px-8 md:px-16 py-6 flex items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(43,70%,50%)] to-[hsl(35,80%,40%)] flex items-center justify-center shadow-lg"
                 style={{ boxShadow: '0 0 30px rgba(212,175,55,0.4)' }}>
              <Scale className="w-7 h-7 text-black" />
            </div>
            <span className="text-2xl font-light tracking-widest">
              <span className="gold-gradient font-semibold">VERI</span>
              <span className="text-white/90">DICTO</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section - Full Screen */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(210,50%,8%)]/90 via-[hsl(0,0%,3%)]/80 to-[hsl(0,0%,3%)]" />
        
        <FloatingParticles count={40} />
        
        <div className="relative z-10 w-full px-8 md:px-16 lg:px-24 pt-32">
          <div className="max-w-5xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-[hsl(43,70%,50%)]/30 bg-[hsl(43,70%,50%)]/5 mb-8 animate-fade-in-up"
                 style={{ boxShadow: '0 0 20px rgba(212,175,55,0.1)' }}>
              <Award className="w-5 h-5 text-[hsl(43,70%,50%)]" />
              <span className="text-sm text-[hsl(43,70%,50%)] tracking-wider uppercase font-medium">
                Plataforma Jurídica #1 do Brasil
              </span>
            </div>
            
            {/* Main Title */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light leading-[0.9] mb-8 animate-fade-in-up animate-delay-100">
              <span className="block text-white/90">Gestão Jurídica</span>
              <span className="block gold-gradient font-semibold mt-2"
                    style={{ textShadow: '0 0 60px rgba(212,175,55,0.4)' }}>
                de Elite
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/60 max-w-2xl mb-12 font-light leading-relaxed animate-fade-in-up animate-delay-200">
              A plataforma escolhida pelos escritórios mais prestigiados. 
              Automatização inteligente, controle absoluto, resultados extraordinários.
            </p>
            
            {/* CTA Button */}
            <div className="animate-fade-in-up animate-delay-300">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="shimmer-btn px-10 py-4 rounded-lg text-black font-semibold text-lg tracking-wide transition-all duration-300 hover:scale-105"
                style={{ animation: 'shimmer 3s linear infinite, pulse-glow 2s ease-in-out infinite' }}
              >
                Solicitar Demonstração
              </button>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-[hsl(43,70%,50%)]/50 to-transparent" />
        </div>
      </section>

      {/* Pilares Section - Replacing Stats */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(210,50%,8%)] via-[hsl(210,60%,12%)] to-[hsl(210,50%,8%)]" />
        
        {/* Decorative lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(43,70%,50%)]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(43,70%,50%)]/40 to-transparent" />
        
        <div className="relative z-10 w-full px-8 md:px-16">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Target,
                title: 'Controle Total',
                description: 'Gerencie todos os seus processos, prazos e audiências em um único painel centralizado'
              },
              {
                icon: Shield,
                title: 'Conformidade',
                description: 'Mantenha seu escritório em total conformidade com OAB, LGPD e regulamentações do setor'
              },
              {
                icon: BarChart3,
                title: 'Inteligência de Dados',
                description: 'Tome decisões estratégicas baseadas em métricas e relatórios financeiros precisos'
              }
            ].map((pilar, index) => (
              <div 
                key={index}
                className="group text-center p-8 rounded-2xl backdrop-blur-xl bg-white/[0.02] border border-white/[0.05] transition-all duration-500 hover:bg-white/[0.05] hover:border-[hsl(43,70%,50%)]/20"
              >
                {/* Icon */}
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[hsl(43,70%,50%)]/20 to-[hsl(35,80%,40%)]/10 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-500"
                     style={{ boxShadow: '0 0 30px rgba(212,175,55,0.2)' }}>
                  <pilar.icon className="w-8 h-8 text-[hsl(43,70%,50%)]" />
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-[hsl(43,70%,50%)] transition-colors duration-300">
                  {pilar.title}
                </h3>
                <p className="text-white/50 leading-relaxed text-sm">
                  {pilar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${libraryBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(0,0%,3%)] via-[hsl(0,0%,3%)]/95 to-[hsl(0,0%,3%)]" />
        
        <FloatingParticles count={20} />
        
        <div className="relative z-10 w-full px-8 md:px-16">
          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light mb-6">
              Recursos <span className="gold-gradient font-semibold">Extraordinários</span>
            </h2>
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-[hsl(43,70%,50%)] to-transparent mx-auto" />
          </div>
          
          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              {
                icon: FileText,
                title: 'Gestão de Processos',
                description: 'Acompanhamento automático em todos os tribunais. Atualizações em tempo real, alertas inteligentes.'
              },
              {
                icon: Users,
                title: 'CRM Jurídico Avançado',
                description: 'Gestão completa de clientes, contratos e relacionamentos. Integração total com seu fluxo.'
              },
              {
                icon: Shield,
                title: 'Segurança Absoluta',
                description: 'Criptografia militar, backup automático, conformidade LGPD. Seus dados blindados.'
              },
              {
                icon: Clock,
                title: 'Controle de Prazos',
                description: 'Nunca mais perca um prazo. Alertas personalizados, agenda integrada, lembretes automáticos.'
              },
              {
                icon: TrendingUp,
                title: 'Analytics & Relatórios',
                description: 'Dashboards executivos, métricas de performance, insights estratégicos para seu escritório.'
              },
              {
                icon: Briefcase,
                title: 'Gestão Financeira',
                description: 'Controle total de honorários, parcelas e cobranças. Fluxo de caixa automatizado.'
              }
            ].map((feature, index) => (
              <div 
                key={index} 
                className="group relative p-8 rounded-2xl backdrop-blur-xl bg-white/[0.02] border border-white/[0.05] transition-all duration-500 hover:bg-white/[0.05] hover:border-[hsl(43,70%,50%)]/20"
                style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.05)' }}
              >
                {/* Icon */}
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[hsl(43,70%,50%)]/20 to-[hsl(35,80%,40%)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500"
                     style={{ boxShadow: '0 0 30px rgba(212,175,55,0.1)' }}>
                  <feature.icon className="w-8 h-8 text-[hsl(43,70%,50%)]" />
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-[hsl(43,70%,50%)] transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-white/50 leading-relaxed">
                  {feature.description}
                </p>
                
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                     style={{ boxShadow: 'inset 0 0 60px rgba(212,175,55,0.05)' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-32 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${tribunalBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(0,0%,3%)] via-[hsl(0,0%,3%)]/90 to-[hsl(0,0%,3%)]/95" />
        
        <div className="relative z-10 w-full px-8 md:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Content */}
              <div>
                <h2 className="text-4xl md:text-5xl font-light mb-8 leading-tight">
                  Por que os melhores escolhem o{' '}
                  <span className="gold-gradient font-semibold">Veridicto</span>?
                </h2>
                
                <div className="space-y-6">
                  {[
                    'Integração com 27 tribunais em tempo real',
                    'Alertas inteligentes de movimentações',
                    'Relatórios financeiros automatizados',
                    'Agenda sincronizada com Google & Outlook',
                    'App mobile exclusivo iOS & Android',
                    'Suporte premium 24 horas',
                    'Onboarding personalizado gratuito',
                    'Atualizações contínuas sem custo extra'
                  ].map((benefit, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-[hsl(43,70%,50%)]/20 transition-all duration-300 group"
                    >
                      <div className="w-3 h-3 rounded-full bg-[hsl(43,70%,50%)] flex-shrink-0 group-hover:scale-125 transition-transform"
                           style={{ boxShadow: '0 0 15px rgba(212,175,55,0.5)' }} />
                      <span className="text-white/70 group-hover:text-white/90 transition-colors">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Right Content - Decorative */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="relative">
                  <div className="w-80 h-80 rounded-full border border-[hsl(43,70%,50%)]/20"
                       style={{ boxShadow: '0 0 100px rgba(212,175,55,0.1)' }}>
                    <div className="absolute inset-8 rounded-full border border-[hsl(43,70%,50%)]/30">
                      <div className="absolute inset-8 rounded-full border border-[hsl(43,70%,50%)]/40">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Scale className="w-20 h-20 text-[hsl(43,70%,50%)]" style={{ filter: 'drop-shadow(0 0 30px rgba(212,175,55,0.5))' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <FloatingParticles count={15} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${cityBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,3%)] via-[hsl(210,50%,8%)]/80 to-[hsl(0,0%,3%)]" />
        
        <FloatingParticles count={50} />
        
        <div className="relative z-10 w-full px-8 md:px-16 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light mb-8 leading-tight">
              Pronto para elevar seu escritório ao{' '}
              <span className="gold-gradient font-semibold block mt-2">próximo nível</span>?
            </h2>
            
            <p className="text-xl text-white/50 mb-12 max-w-2xl mx-auto">
              Junte-se aos escritórios de elite que confiam no Veridicto para 
              transformar sua operação jurídica.
            </p>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="shimmer-btn px-12 py-5 rounded-lg text-black font-semibold text-xl tracking-wide transition-all duration-300 hover:scale-105"
              style={{ animation: 'shimmer 3s linear infinite, pulse-glow 2s ease-in-out infinite' }}
            >
              Solicitar Demonstração Exclusiva
            </button>
          </div>
        </div>
      </section>

      {/* Footer - Ultra Minimalist */}
      <footer className="relative py-12 bg-black">
        <div className="w-full px-8 md:px-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[hsl(43,70%,50%)] to-[hsl(35,80%,40%)] flex items-center justify-center">
                <Scale className="w-5 h-5 text-black" />
              </div>
              <span className="text-xl font-light tracking-widest">
                <span className="gold-gradient font-semibold">VERI</span>
                <span className="text-white/70">DICTO</span>
              </span>
            </div>
            
            {/* Copyright */}
            <div className="text-white/30 text-sm">
              © 2024 Veridicto. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Request Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[hsl(210,50%,8%)]/95 backdrop-blur-xl border border-[hsl(43,70%,50%)]/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light text-center">
              <span className="gold-gradient font-semibold">Solicitar</span>{' '}
              <span className="text-white/90">Demonstração</span>
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-white/70">Nome completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Seu nome completo"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(43,70%,50%)]/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70">E-mail profissional *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="seu@email.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(43,70%,50%)]/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="celular" className="text-white/70">Celular/WhatsApp *</Label>
              <Input
                id="celular"
                type="tel"
                value={formData.celular}
                onChange={(e) => handleInputChange('celular', formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(43,70%,50%)]/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="colaboradores" className="text-white/70">Quantidade de colaboradores</Label>
              <Select value={formData.colaboradores} onValueChange={(value) => handleInputChange('colaboradores', value)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-[hsl(43,70%,50%)]/50">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(210,50%,12%)] border-white/10">
                  <SelectItem value="1-5" className="text-white hover:bg-white/10">1-5 colaboradores</SelectItem>
                  <SelectItem value="6-15" className="text-white hover:bg-white/10">6-15 colaboradores</SelectItem>
                  <SelectItem value="16-30" className="text-white hover:bg-white/10">16-30 colaboradores</SelectItem>
                  <SelectItem value="31-50" className="text-white hover:bg-white/10">31-50 colaboradores</SelectItem>
                  <SelectItem value="50+" className="text-white hover:bg-white/10">Mais de 50 colaboradores</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="processos" className="text-white/70">Processos simultâneos monitorados</Label>
              <Select value={formData.processos} onValueChange={(value) => handleInputChange('processos', value)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-[hsl(43,70%,50%)]/50">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(210,50%,12%)] border-white/10">
                  <SelectItem value="até-100" className="text-white hover:bg-white/10">Até 100 processos</SelectItem>
                  <SelectItem value="100-500" className="text-white hover:bg-white/10">100-500 processos</SelectItem>
                  <SelectItem value="500-1000" className="text-white hover:bg-white/10">500-1.000 processos</SelectItem>
                  <SelectItem value="1000-5000" className="text-white hover:bg-white/10">1.000-5.000 processos</SelectItem>
                  <SelectItem value="5000+" className="text-white hover:bg-white/10">Mais de 5.000 processos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full shimmer-btn px-8 py-4 rounded-lg text-black font-semibold text-lg tracking-wide transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              style={{ animation: 'shimmer 3s linear infinite' }}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Easter Egg */}
      <button
        onClick={() => setShowEasterEgg(!showEasterEgg)}
        className="fixed bottom-4 right-4 w-8 h-8 opacity-0 hover:opacity-10 transition-opacity z-50"
        aria-label="Secret"
      >
        <KeyRound className="w-4 h-4 text-[hsl(43,70%,50%)]" />
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
            className="w-32 h-8 text-sm backdrop-blur-md bg-black/80 border-[hsl(43,70%,50%)]/50 text-white focus:ring-[hsl(43,70%,50%)]"
          />
        </div>
      )}
    </div>
  );
};

export default VeridictoLanding;
