import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Fingerprint, 
  Clock, 
  Shield, 
  Zap, 
  ChevronRight, 
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

const BatinkLanding = () => {
  const navigate = useNavigate();
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
      
      <div className="min-h-screen w-full overflow-x-hidden relative">
        {/* Header */}
        <header 
          className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
          style={{ 
            backgroundColor: 'hsla(270, 50%, 8%, 0.9)',
            borderColor: colors.border
          }}
        >
          <div className="flex items-center justify-between h-20 px-6 lg:px-12">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}
                >
                  <Fingerprint className="w-7 h-7 text-white" />
                </div>
                <div 
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full animate-pulse shadow-lg"
                  style={{ backgroundColor: colors.accent, boxShadow: `0 0 10px ${colors.accent}` }}
                />
              </div>
              <span className="text-2xl font-bold tracking-tight" style={{ color: colors.primary }}>
                BATINK
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/batink/auth')}
                className="hidden sm:flex transition-all duration-300"
                style={{ color: colors.textSecondary }}
              >
                Entrar
              </Button>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="transition-all duration-300"
                style={{ 
                  backgroundColor: colors.accent,
                  color: colors.bgMain,
                }}
              >
                Agendar Demo
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section with Background Image */}
        <section 
          className="min-h-screen flex items-center relative overflow-hidden"
          style={{ paddingTop: '80px' }}
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
              background: `linear-gradient(90deg, ${colors.bgMain} 0%, hsla(270, 50%, 8%, 0.85) 50%, hsla(270, 50%, 8%, 0.7) 100%)`
            }}
          />
          
          <div className="relative z-10 w-full px-6 lg:px-12">
            <div className="max-w-3xl">
              <div 
                className="inline-block px-4 py-2 rounded-full mb-6 text-sm font-medium"
                style={{ 
                  backgroundColor: 'hsla(320, 85%, 50%, 0.15)',
                  color: colors.primary,
                  border: `1px solid ${colors.primary}`
                }}
              >
                ✨ Sistema de Ponto Digital #1 do Brasil
              </div>
              
              <h1 
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
                style={{ color: colors.textMain }}
              >
                Gestão de Ponto{' '}
                <span style={{ color: colors.primary }}>Digital</span>
              </h1>
              
              <p 
                className="text-lg sm:text-xl md:text-2xl mb-4 max-w-2xl"
                style={{ color: colors.textSecondary }}
              >
                O ponto certo para sua equipe.
              </p>
              
              <p 
                className="text-base sm:text-lg mb-8 max-w-xl"
                style={{ color: colors.textSecondary }}
              >
                Simplifique o controle de ponto e garanta conformidade legal com tecnologia de ponta. Tudo em um só lugar.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => setIsModalOpen(true)}
                  className="text-lg px-8 py-6 font-semibold transition-all duration-300 hover:scale-105"
                  style={{
                    backgroundColor: colors.accent,
                    color: colors.bgMain,
                    boxShadow: `0 0 30px hsla(45, 90%, 50%, 0.4)`
                  }}
                >
                  Começar Agora
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/batink/auth')}
                  className="text-lg px-8 py-6 font-semibold border-2 bg-transparent transition-all duration-300"
                  style={{ 
                    borderColor: colors.textSecondary,
                    color: colors.textMain
                  }}
                >
                  Acessar Sistema
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section 
          className="py-20 border-b"
          style={{ 
            backgroundColor: 'hsl(270, 45%, 10%)',
            borderColor: colors.border
          }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {index === 0 && <TrendingUp className="w-8 h-8" style={{ color: colors.textSecondary }} />}
                    {index === 1 && <BarChart3 className="w-8 h-8" style={{ color: colors.textSecondary }} />}
                    {index === 2 && <Target className="w-8 h-8" style={{ color: colors.textSecondary }} />}
                  </div>
                  <p className="text-lg mb-1" style={{ color: colors.textSecondary }}>
                    {stat.label}{' '}
                    <span className="font-bold text-2xl sm:text-3xl" style={{ color: colors.green }}>
                      {stat.value}
                    </span>
                    {stat.suffix}
                  </p>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    {stat.description}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center mt-12">
              <Button
                size="lg"
                onClick={() => setIsModalOpen(true)}
                className="text-lg px-8 py-6 font-semibold transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: colors.accent,
                  color: colors.bgMain,
                }}
              >
                Agendar Demonstração
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24" style={{ backgroundColor: colors.bgMain }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="text-center mb-16">
              <h2 
                className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
                style={{ color: colors.textMain }}
              >
                Por que escolher o{' '}
                <span style={{ color: colors.primary }}>BATINK</span>?
              </h2>
              <p 
                className="text-lg max-w-2xl mx-auto"
                style={{ color: colors.textSecondary }}
              >
                Tecnologia de ponta para simplificar a gestão de ponto da sua empresa
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-8 rounded-2xl backdrop-blur-sm border transition-all duration-300 hover:scale-105 cursor-default group"
                  style={{
                    backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
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
                    className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-all duration-300"
                    style={{ backgroundColor: 'hsla(320, 85%, 50%, 0.15)' }}
                  >
                    <feature.icon className="w-8 h-8" style={{ color: colors.primary }} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3" style={{ color: colors.textMain }}>
                    {feature.title}
                  </h3>
                  <p className="text-base" style={{ color: colors.textSecondary }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section - Split Layout */}
        <section 
          className="py-24"
          style={{ 
            background: `linear-gradient(180deg, hsl(270, 40%, 12%) 0%, ${colors.bgMain} 100%)`
          }}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left - Image placeholder with glow effect */}
              <div className="relative">
                <div 
                  className="aspect-video rounded-2xl overflow-hidden border-2"
                  style={{ 
                    borderColor: colors.primary,
                    boxShadow: `0 0 60px hsla(320, 85%, 50%, 0.3)`
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
              
              {/* Right - Content */}
              <div>
                <h2 
                  className="text-3xl sm:text-4xl font-bold mb-6"
                  style={{ color: colors.green }}
                >
                  Controle de Ponto Digital
                </h2>
                <p 
                  className="text-lg mb-8"
                  style={{ color: colors.textSecondary }}
                >
                  Elimine burocracias e feche sua folha até 25x mais rápido. Tudo 100% em conformidade com a legislação, com cálculos precisos feitos em minutos.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'hsla(150, 80%, 50%, 0.15)' }}
                      >
                        <benefit.icon className="w-4 h-4" style={{ color: colors.green }} />
                      </div>
                      <span style={{ color: colors.textMain }}>{benefit.text}</span>
                    </div>
                  ))}
                </div>
                
                <Button
                  size="lg"
                  onClick={() => setIsModalOpen(true)}
                  className="font-semibold transition-all duration-300 hover:scale-105"
                  style={{
                    backgroundColor: colors.accent,
                    color: colors.bgMain,
                  }}
                >
                  Agendar Demonstração
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24" style={{ backgroundColor: colors.bgMain }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="text-center mb-16">
              <h2 
                className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
                style={{ color: colors.textMain }}
              >
                Como{' '}
                <span style={{ color: colors.primary }}>funciona</span>?
              </h2>
              <p 
                className="text-lg max-w-2xl mx-auto"
                style={{ color: colors.textSecondary }}
              >
                Em apenas 3 passos simples você moderniza o controle de ponto
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {howItWorks.map((step, index) => (
                <div key={index} className="text-center relative">
                  {/* Step number */}
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold"
                    style={{ 
                      backgroundColor: colors.primary,
                      color: colors.textMain
                    }}
                  >
                    {index + 1}
                  </div>
                  
                  {/* Icon */}
                  <div 
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.8)',
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    <step.icon className="w-10 h-10" style={{ color: colors.accent }} />
                  </div>
                  
                  <h3 
                    className="text-xl font-bold mb-3"
                    style={{ color: colors.textMain }}
                  >
                    {step.title}
                  </h3>
                  <p style={{ color: colors.textSecondary }}>
                    {step.description}
                  </p>
                  
                  {/* Connector line */}
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

        {/* CTA Section */}
        <section 
          className="py-24"
          style={{
            background: `linear-gradient(180deg, ${colors.bgMain} 0%, hsl(270, 40%, 12%) 100%)`
          }}
        >
          <div className="max-w-4xl mx-auto px-6 text-center">
            <Globe className="w-16 h-16 mx-auto mb-6" style={{ color: colors.primary }} />
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
              style={{ color: colors.textMain }}
            >
              Pronto para modernizar o controle de ponto da sua empresa?
            </h2>
            <p 
              className="text-lg mb-8"
              style={{ color: colors.textSecondary }}
            >
              Junte-se a centenas de empresas que já simplificaram sua gestão de ponto
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => setIsModalOpen(true)}
                className="text-lg px-8 py-6 font-semibold transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: colors.accent,
                  color: colors.bgMain,
                  boxShadow: `0 0 30px hsla(45, 90%, 50%, 0.4)`
                }}
              >
                Acessar Sistema
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/batink/auth')}
                className="text-lg px-8 py-6 font-semibold border-2 bg-transparent transition-all duration-300"
                style={{ 
                  borderColor: colors.primary,
                  color: colors.primary
                }}
              >
                Fazer Login
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer 
          className="py-8 border-t"
          style={{ backgroundColor: colors.bgMain, borderColor: colors.border }}
        >
          <div className="px-6 text-center">
            <p style={{ color: colors.textSecondary }}>
              © 2024{' '}
              <span style={{ color: colors.primary }}>BATINK</span>
              . Todos os direitos reservados.
            </p>
          </div>
        </footer>

        {/* Contact Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent 
            className="max-w-md border"
            style={{ backgroundColor: 'hsl(270, 40%, 12%)', borderColor: colors.border }}
          >
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center" style={{ color: colors.textMain }}>
                {isSubmitted ? 'Obrigado!' : 'Fale Conosco'}
              </DialogTitle>
            </DialogHeader>

            {isSubmitted ? (
              <div className="py-8 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: colors.accent }} />
                <p className="text-lg" style={{ color: colors.textSecondary }}>
                  Recebemos suas informações! Um especialista BATINK entrará em contato em breve.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="flex items-center gap-2" style={{ color: colors.textSecondary }}>
                    <User className="w-4 h-4" /> Nome *
                  </Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    required
                    placeholder="Seu nome completo"
                    className="border focus:ring-2"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                      borderColor: colors.border,
                      color: colors.textMain
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone" className="flex items-center gap-2" style={{ color: colors.textSecondary }}>
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
                    className="border"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                      borderColor: colors.border,
                      color: colors.textMain
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2" style={{ color: colors.textSecondary }}>
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
                    className="border"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                      borderColor: colors.border,
                      color: colors.textMain
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade" className="flex items-center gap-2" style={{ color: colors.textSecondary }}>
                    <MapPin className="w-4 h-4" /> Cidade *
                  </Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    required
                    placeholder="Sua cidade"
                    className="border"
                    style={{ 
                      backgroundColor: 'hsla(270, 40%, 15%, 0.6)',
                      borderColor: colors.border,
                      color: colors.textMain
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2" style={{ color: colors.textSecondary }}>
                    <Users className="w-4 h-4" /> Quantos funcionários *
                  </Label>
                  <Select
                    value={formData.funcionarios}
                    onValueChange={(value) => setFormData({ ...formData, funcionarios: value })}
                    required
                  >
                    <SelectTrigger 
                      className="border"
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
                  className="w-full mt-6 font-semibold transition-all duration-300"
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
