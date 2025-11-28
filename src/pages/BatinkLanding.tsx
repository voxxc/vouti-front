import { useState } from 'react';
import { 
  Fingerprint, 
  Clock, 
  Shield, 
  Zap, 
  CheckCircle,
  User,
  Phone,
  Mail,
  MapPin,
  Users,
  TrendingUp,
  Target,
  Smartphone,
  Cloud,
  Lock,
  FileCheck,
  BarChart3,
  UserCheck,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import heroBg from '@/assets/batink-hero-bg.jpg';
import statsBg from '@/assets/batink-stats-bg.jpg';
import featuresBg from '@/assets/batink-features-bg.jpg';
import benefitsBg from '@/assets/batink-benefits-bg.jpg';
import howitBg from '@/assets/batink-howit-bg.jpg';
import ctaBg from '@/assets/batink-cta-bg.jpg';

const BatinkLanding = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);

    try {
      const { error } = await supabase.from('leads_captacao').insert({
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email,
        comentario: `Cidade: ${formData.cidade} | Funcionários: ${formData.funcionarios}`,
        origem: 'batink_landing',
        tipo: 'batink',
        status: 'novo',
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success('Dados enviados com sucesso!');

      setTimeout(() => {
        setIsModalOpen(false);
        setIsSubmitted(false);
        setFormData({ nome: '', telefone: '', email: '', cidade: '', funcionarios: '' });
      }, 3000);
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Clock,
      title: 'Precisão',
      description: 'Registro de ponto com precisão de segundos e geolocalização integrada',
    },
    {
      icon: Zap,
      title: 'Agilidade',
      description: 'Interface intuitiva para registros rápidos em qualquer dispositivo',
    },
    {
      icon: Shield,
      title: 'Segurança',
      description: 'Dados protegidos com criptografia e backup automático',
    },
  ];

  const stats = [
    { value: '80%', label: 'Reduza', suffix: ' dos gastos', description: 'com pagamentos de horas extras' },
    { value: '25x', label: 'Feche sua folha até', suffix: ' mais rápido', description: 'com 100% de conformidade com a legislação' },
    { value: '+30', label: 'Automatize mais de', suffix: ' processos', description: 'da rotina do DP em um sistema completo' },
  ];

  const benefits = [
    { icon: Cloud, text: 'Armazenamento em nuvem' },
    { icon: Lock, text: 'Controle de permissões' },
    { icon: Shield, text: 'Selo de segurança' },
    { icon: FileCheck, text: 'Conformidade garantida' },
    { icon: Smartphone, text: 'App para colaboradores' },
    { icon: BarChart3, text: 'Relatórios em tempo real' },
  ];

  const howItWorks = [
    { icon: Smartphone, title: 'Registro pelo App', description: 'Seus colaboradores registram o ponto pelo smartphone com geolocalização' },
    { icon: UserCheck, title: 'Validação Automática', description: 'O sistema valida e organiza automaticamente todos os registros' },
    { icon: BarChart3, title: 'Relatórios Completos', description: 'Gere relatórios de horas trabalhadas, faltas e extras instantaneamente' },
  ];

  // HSL Colors as per specification
  const colors = {
    bgMain: 'hsl(270, 50%, 8%)',
    primary: 'hsl(320, 85%, 50%)',
    accent: 'hsl(45, 90%, 50%)',
    cardBg: 'hsl(270, 40%, 15%)',
    textMain: 'hsl(0, 0%, 98%)',
    textSecondary: 'hsl(270, 20%, 70%)',
    border: 'hsl(270, 30%, 30%)',
    green: 'hsl(150, 80%, 50%)',
  };

  return (
    <>
      {/* Background fixo */}
      <div className="fixed inset-0 -z-10" style={{ backgroundColor: colors.bgMain }} />
      
      <div className="min-h-screen w-full overflow-x-hidden relative scroll-smooth">
        {/* Header - Clean logo only */}
        <header 
          className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
          style={{ 
            backgroundColor: 'hsla(270, 50%, 8%, 0.9)',
            borderColor: colors.border
          }}
        >
          <div className="flex items-center justify-center h-16 sm:h-20 px-4 sm:px-6 lg:px-12">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}
                >
                  <Fingerprint className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                </div>
                <div 
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full animate-pulse shadow-lg"
                  style={{ backgroundColor: colors.accent, boxShadow: `0 0 10px ${colors.accent}` }}
                />
              </div>
              <span className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: colors.primary }}>
                BATINK
              </span>
            </div>
          </div>
        </header>

        {/* Hero Section - Mobile Responsive */}
        <section 
          className="min-h-screen flex items-center relative overflow-hidden pt-16 sm:pt-20"
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: `url(${heroBg})`,
            }}
          />
          {/* Dark Overlay with Gradient */}
          <div 
            className="absolute inset-0"
            style={{ 
              background: `linear-gradient(90deg, ${colors.bgMain} 0%, hsla(270, 50%, 8%, 0.95) 30%, hsla(270, 50%, 8%, 0.85) 60%, hsla(270, 50%, 8%, 0.7) 100%)`
            }}
          />
          
          <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 py-8 sm:py-0">
            <div className="max-w-full sm:max-w-2xl lg:max-w-3xl mx-auto sm:mx-0 text-center sm:text-left">
              <div 
                className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-4 sm:mb-6 text-xs sm:text-sm font-medium"
                style={{ 
                  backgroundColor: 'hsla(320, 85%, 50%, 0.15)',
                  color: colors.primary,
                  border: `1px solid ${colors.primary}`
                }}
              >
                ✨ Sistema de Ponto Digital #1 do Brasil
              </div>
              
              <h1 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight"
                style={{ color: colors.textMain }}
              >
                Gestão de Ponto{' '}
                <span style={{ color: colors.primary }}>Digital</span>
              </h1>
              
              <p 
                className="text-base sm:text-lg md:text-xl lg:text-2xl mb-3 sm:mb-4"
                style={{ color: colors.textSecondary }}
              >
                O ponto certo para sua equipe.
              </p>
              
              <p 
                className="text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 max-w-xl mx-auto sm:mx-0"
                style={{ color: colors.textSecondary }}
              >
                Simplifique o controle de ponto e garanta conformidade legal com tecnologia de ponta. Tudo em um só lugar.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section with Background Image */}
        <section className="relative py-12 sm:py-16 lg:py-20 overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${statsBg})` }}
          />
          {/* Dark Overlay */}
          <div 
            className="absolute inset-0"
            style={{ 
              background: `linear-gradient(135deg, hsla(270, 50%, 8%, 0.92) 0%, hsla(270, 45%, 10%, 0.88) 50%, hsla(270, 50%, 8%, 0.92) 100%)`
            }}
          />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
            <div className="grid grid-cols-1 gap-8 sm:gap-6 md:grid-cols-3 md:gap-12">
              {stats.map((stat, index) => (
                <div key={index} className="text-center relative">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {index === 0 && <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: colors.textSecondary }} />}
                    {index === 1 && <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: colors.textSecondary }} />}
                    {index === 2 && <Target className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: colors.textSecondary }} />}
                  </div>
                  <p className="text-base sm:text-lg mb-1" style={{ color: colors.textSecondary }}>
                    {stat.label}{' '}
                    <span className="font-bold text-2xl sm:text-3xl lg:text-4xl" style={{ color: colors.green }}>
                      {stat.value}
                    </span>
                    {stat.suffix}
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: colors.textSecondary }}>
                    {stat.description}
                  </p>
                  
                  {/* Mobile separator */}
                  {index < 2 && (
                    <div 
                      className="md:hidden w-16 h-0.5 mx-auto mt-8"
                      style={{ backgroundColor: colors.border }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section with Background Image */}
        <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${featuresBg})` }}
          />
          {/* Dark Overlay */}
          <div 
            className="absolute inset-0"
            style={{ 
              background: `linear-gradient(180deg, hsla(270, 50%, 8%, 0.95) 0%, hsla(270, 45%, 10%, 0.90) 50%, hsla(270, 50%, 8%, 0.95) 100%)`
            }}
          />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
            <div className="text-center mb-10 sm:mb-12 lg:mb-16">
              <h2 
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4"
                style={{ color: colors.textMain }}
              >
                Por que escolher o{' '}
                <span style={{ color: colors.primary }}>BATINK</span>?
              </h2>
              <p 
                className="text-base sm:text-lg max-w-2xl mx-auto px-4 sm:px-0"
                style={{ color: colors.textSecondary }}
              >
                Tecnologia de ponta para simplificar a gestão de ponto da sua empresa
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-5 sm:p-6 lg:p-8 rounded-2xl backdrop-blur-md border transition-all duration-300 hover:scale-105 cursor-default group text-center sm:text-left"
                  style={{
                    backgroundColor: 'hsla(270, 40%, 15%, 0.7)',
                    borderColor: colors.border,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.primary;
                    e.currentTarget.style.boxShadow = `0 0 30px hsla(320, 85%, 50%, 0.3)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div 
                    className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 transition-all duration-300 mx-auto sm:mx-0"
                    style={{ backgroundColor: 'hsla(320, 85%, 50%, 0.15)' }}
                  >
                    <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" style={{ color: colors.primary }} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3" style={{ color: colors.textMain }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base" style={{ color: colors.textSecondary }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section with Background Image */}
        <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${benefitsBg})` }}
          />
          {/* Dark Overlay */}
          <div 
            className="absolute inset-0"
            style={{ 
              background: `linear-gradient(135deg, hsla(270, 50%, 8%, 0.93) 0%, hsla(270, 40%, 12%, 0.88) 50%, hsla(270, 50%, 8%, 0.93) 100%)`
            }}
          />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
              {/* Image - appears second on mobile */}
              <div className="relative order-2 lg:order-1">
                <div 
                  className="aspect-video rounded-2xl overflow-hidden border-2 backdrop-blur-sm"
                  style={{ 
                    borderColor: colors.primary,
                    boxShadow: `0 0 40px hsla(320, 85%, 50%, 0.2), 0 0 60px hsla(320, 85%, 50%, 0.1)`
                  }}
                >
                  <img 
                    src={heroBg} 
                    alt="BATINK em uso" 
                    className="w-full h-full object-cover"
                  />
                  <div 
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(135deg, hsla(320, 85%, 50%, 0.2), transparent)` }}
                  />
                </div>
              </div>
              
              {/* Content - appears first on mobile */}
              <div className="order-1 lg:order-2 text-center lg:text-left">
                <h2 
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6"
                  style={{ color: colors.green }}
                >
                  Controle de Ponto Digital
                </h2>
                <p 
                  className="text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto lg:mx-0"
                  style={{ color: colors.textSecondary }}
                >
                  Elimine burocracias e feche sua folha até 25x mais rápido. Tudo 100% em conformidade com a legislação, com cálculos precisos feitos em minutos.
                </p>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2 sm:gap-3 justify-center lg:justify-start">
                      <div 
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'hsla(150, 80%, 50%, 0.15)' }}
                      >
                        <benefit.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: colors.green }} />
                      </div>
                      <span className="text-sm sm:text-base" style={{ color: colors.textMain }}>{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section with Background Image */}
        <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${howitBg})` }}
          />
          {/* Dark Overlay */}
          <div 
            className="absolute inset-0"
            style={{ 
              background: `linear-gradient(180deg, hsla(270, 50%, 8%, 0.90) 0%, hsla(270, 45%, 10%, 0.85) 50%, hsla(270, 50%, 8%, 0.90) 100%)`
            }}
          />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
            <div className="text-center mb-10 sm:mb-12 lg:mb-16">
              <h2 
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4"
                style={{ color: colors.textMain }}
              >
                Como{' '}
                <span style={{ color: colors.primary }}>funciona</span>?
              </h2>
              <p 
                className="text-base sm:text-lg max-w-2xl mx-auto px-4 sm:px-0"
                style={{ color: colors.textSecondary }}
              >
                Em apenas 3 passos simples você moderniza o controle de ponto
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-8">
              {howItWorks.map((step, index) => (
                <div key={index} className="text-center relative">
                  {/* Step number */}
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-lg sm:text-xl font-bold"
                    style={{ 
                      backgroundColor: colors.primary,
                      color: colors.textMain
                    }}
                  >
                    {index + 1}
                  </div>
                  
                  {/* Icon */}
                  <div 
                    className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 backdrop-blur-sm"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.8)',
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    <step.icon className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10" style={{ color: colors.accent }} />
                  </div>
                  
                  <h3 
                    className="text-lg sm:text-xl font-bold mb-2 sm:mb-3"
                    style={{ color: colors.textMain }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-base px-4 sm:px-0" style={{ color: colors.textSecondary }}>
                    {step.description}
                  </p>
                  
                  {/* Mobile vertical connector */}
                  {index < 2 && (
                    <div 
                      className="md:hidden w-0.5 h-8 mx-auto mt-8"
                      style={{ backgroundColor: colors.border }}
                    />
                  )}
                  
                  {/* Desktop horizontal connector line */}
                  {index < 2 && (
                    <div 
                      className="hidden md:block absolute top-24 left-[60%] w-[80%] h-0.5"
                      style={{ backgroundColor: colors.border }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section with Background Image */}
        <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${ctaBg})` }}
          />
          {/* Dark Overlay */}
          <div 
            className="absolute inset-0"
            style={{ 
              background: `linear-gradient(180deg, hsla(270, 50%, 8%, 0.92) 0%, hsla(270, 40%, 12%, 0.88) 50%, hsla(270, 50%, 8%, 0.92) 100%)`
            }}
          />
          
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <Globe className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 mx-auto mb-4 sm:mb-6" style={{ color: colors.primary }} />
            <h2 
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 px-2"
              style={{ color: colors.textMain }}
            >
              Pronto para modernizar o controle de ponto da sua empresa?
            </h2>
            <p 
              className="text-base sm:text-lg mb-6 sm:mb-8"
              style={{ color: colors.textSecondary }}
            >
              Junte-se a centenas de empresas que já simplificaram sua gestão de ponto
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer 
          className="py-6 sm:py-8 border-t"
          style={{ backgroundColor: colors.bgMain, borderColor: colors.border }}
        >
          <div className="px-4 sm:px-6 text-center">
            <p className="text-sm sm:text-base" style={{ color: colors.textSecondary }}>
              © 2024{' '}
              <span style={{ color: colors.primary }}>BATINK</span>
              . Todos os direitos reservados.
            </p>
          </div>
        </footer>

        {/* Contact Modal - Mobile Responsive */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent 
            className="max-w-[95vw] sm:max-w-md border mx-auto"
            style={{ backgroundColor: 'hsl(270, 40%, 12%)', borderColor: colors.border }}
          >
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-center" style={{ color: colors.textMain }}>
                {isSubmitted ? 'Obrigado!' : 'Fale Conosco'}
              </DialogTitle>
            </DialogHeader>

            {isSubmitted ? (
              <div className="py-6 sm:py-8 text-center">
                <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4" style={{ color: colors.accent }} />
                <p className="text-base sm:text-lg px-2" style={{ color: colors.textSecondary }}>
                  Recebemos suas informações! Um especialista BATINK entrará em contato em breve.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="nome" className="flex items-center gap-2 text-sm sm:text-base" style={{ color: colors.textSecondary }}>
                    <User className="w-4 h-4" /> Nome *
                  </Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    required
                    placeholder="Seu nome completo"
                    className="border focus:ring-2 text-sm sm:text-base h-10 sm:h-11"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                      borderColor: colors.border,
                      color: colors.textMain
                    }}
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="telefone" className="flex items-center gap-2 text-sm sm:text-base" style={{ color: colors.textSecondary }}>
                    <Phone className="w-4 h-4" /> Telefone *
                  </Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    type="tel"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    required
                    placeholder="(00) 00000-0000"
                    className="border text-sm sm:text-base h-10 sm:h-11"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                      borderColor: colors.border,
                      color: colors.textMain
                    }}
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-sm sm:text-base" style={{ color: colors.textSecondary }}>
                    <Mail className="w-4 h-4" /> Email *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="seu@email.com"
                    className="border text-sm sm:text-base h-10 sm:h-11"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                      borderColor: colors.border,
                      color: colors.textMain
                    }}
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="cidade" className="flex items-center gap-2 text-sm sm:text-base" style={{ color: colors.textSecondary }}>
                    <MapPin className="w-4 h-4" /> Cidade *
                  </Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    required
                    placeholder="Sua cidade"
                    className="border text-sm sm:text-base h-10 sm:h-11"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                      borderColor: colors.border,
                      color: colors.textMain
                    }}
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="flex items-center gap-2 text-sm sm:text-base" style={{ color: colors.textSecondary }}>
                    <Users className="w-4 h-4" /> Quantos funcionários *
                  </Label>
                  <Select
                    value={formData.funcionarios}
                    onValueChange={(value) => setFormData({ ...formData, funcionarios: value })}
                    required
                  >
                    <SelectTrigger 
                      className="border h-10 sm:h-11"
                      style={{ 
                        backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                        borderColor: colors.border,
                        color: colors.textMain
                      }}
                    >
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="border" style={{ backgroundColor: 'hsl(270, 40%, 15%)', borderColor: colors.border }}>
                      <SelectItem value="1-10" style={{ color: colors.textMain }}>1-10</SelectItem>
                      <SelectItem value="11-50" style={{ color: colors.textMain }}>11-50</SelectItem>
                      <SelectItem value="51-100" style={{ color: colors.textMain }}>51-100</SelectItem>
                      <SelectItem value="101-500" style={{ color: colors.textMain }}>101-500</SelectItem>
                      <SelectItem value="500+" style={{ color: colors.textMain }}>500+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4 sm:mt-6 font-semibold transition-all duration-300 h-11 sm:h-12"
                  disabled={isLoading}
                  style={{ backgroundColor: colors.accent, color: colors.bgMain }}
                >
                  {isLoading ? 'Enviando...' : 'Enviar'}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default BatinkLanding;
