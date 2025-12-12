import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createLandingLead } from '@/hooks/useLandingLeads';
import { 
  Scale, 
  Users, 
  Calendar, 
  DollarSign, 
  FileText, 
  Bell,
  Search,
  LayoutGrid,
  Handshake,
  MessageSquare,
  BarChart3,
  Gauge,
  Zap,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle2,
  Building2,
  User,
  Building,
  Briefcase,
  Star,
  ArrowRight,
  Mail,
  Phone,
  ChevronDown,
  Loader2
} from 'lucide-react';
import LogoVouti from '@/components/LogoVouti';

const HomePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [easterEggCode, setEasterEggCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    tamanho: ''
  });

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast({
        title: 'Campo obrigatorio',
        description: 'Por favor, informe seu nome.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createLandingLead({
        nome: formData.nome,
        email: formData.email || undefined,
        telefone: formData.whatsapp || undefined,
        tamanho_escritorio: formData.tamanho || undefined,
        origem: 'vouti_landing'
      });

      toast({
        title: 'Solicitacao enviada!',
        description: 'Entraremos em contato em breve.'
      });

      setFormData({ nome: '', email: '', whatsapp: '', tamanho: '' });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEasterEggSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = easterEggCode.toLowerCase().trim();
      
      if (code === 'jusvouti') {
        await supabase.auth.signOut();
        sessionStorage.setItem('selectedTenant', 'solvenza');
        navigate('/solvenza/auth');
      } else if (code === 'metal') {
        await supabase.auth.signOut();
        navigate('/metal-auth');
      } else if (code === 'vlink') {
        await supabase.auth.signOut();
        navigate('/link-auth');
      } else if (code === 'adm1nvouti') {
        await supabase.auth.signOut();
        navigate('/super-admin');
      } else if (code === 'batink') {
        navigate('/batink');
      } else if (code === 'veridicto') {
        navigate('/veridicto');
      }
      
      setEasterEggCode('');
      setShowEasterEgg(false);
    }
  };

  const modules = [
    { icon: FileText, title: 'Landing Page Inteligente', desc: 'Capture leads com páginas otimizadas para conversão' },
    { icon: Users, title: 'CRM Jurídico', desc: 'Gestão visual de oportunidades estilo Kanban' },
    { icon: User, title: 'Cadastro de Clientes', desc: 'Perfis completos com histórico e documentação' },
    { icon: DollarSign, title: 'Gestão Financeira', desc: 'Honorários, contratos, mensalidades, fluxo de caixa' },
    { icon: Calendar, title: 'Controle de Prazos', desc: 'Agenda automatizada com alertas inteligentes' },
    { icon: Scale, title: 'Controladoria Jurídica', desc: 'Andamentos, intimações e resumos em tempo real' },
    { icon: Search, title: 'Monitoramento CPF/CNPJ', desc: 'Push-Docs com notificações de novos processos' },
    { icon: LayoutGrid, title: 'Projetos Kanban', desc: 'Boards visuais para gestão de tarefas e acordos' },
    { icon: Handshake, title: 'Gestão de Acordos', desc: 'Controle completo de negociações e parcelamentos' },
    { icon: MessageSquare, title: 'Chat Interno', desc: 'Comunicação integrada entre equipe' },
    { icon: BarChart3, title: 'Relatórios Automatizados', desc: 'Exportação de dados e métricas em PDF' },
    { icon: Gauge, title: 'Dashboard Indicadores', desc: 'Visão completa da operação em tempo real' },
  ];

  const benefits = [
    { icon: TrendingUp, title: 'Aumento real de produtividade', desc: 'Automatize tarefas repetitivas e foque no que importa' },
    { icon: Shield, title: 'Redução de erros e retrabalho', desc: 'Processos padronizados que eliminam falhas humanas' },
    { icon: DollarSign, title: 'Controle financeiro preciso', desc: 'Visão clara de receitas, despesas e inadimplência' },
    { icon: Zap, title: 'Automação de rotinas jurídicas', desc: 'Andamentos, prazos e intimações monitorados 24/7' },
    { icon: Users, title: 'Organização total da equipe', desc: 'Tarefas distribuídas e acompanhamento em tempo real' },
    { icon: CheckCircle2, title: 'Visão completa da operação', desc: 'Dashboards que metrificam toda a performance' },
  ];

  const personas = [
    { icon: User, title: 'Advogados Autônomos', desc: 'Organize sua rotina e potencialize resultados' },
    { icon: Building2, title: 'Escritórios Pequenos e Médios', desc: 'Escale operações sem perder o controle' },
    { icon: Building, title: 'Escritórios de Grande Porte', desc: 'Gestão unificada de múltiplas equipes e áreas' },
    { icon: Briefcase, title: 'Departamentos Jurídicos', desc: 'Integração com operações corporativas' },
  ];

  const testimonials = [
    {
      name: 'Dr. Ricardo Mendes',
      role: 'Sócio-Fundador, Mendes & Associados',
      text: 'A VOUTI transformou completamente nossa operação. Reduzimos em 40% o tempo gasto com tarefas administrativas.',
      rating: 5
    },
    {
      name: 'Dra. Camila Santos',
      role: 'Advogada, Santos Advocacia',
      text: 'Nunca mais perdi um prazo. O sistema de alertas e a controladoria são impecáveis.',
      rating: 5
    },
    {
      name: 'Dr. Fernando Costa',
      role: 'Diretor Jurídico, Grupo Empresarial',
      text: 'A visibilidade que temos hoje sobre nossa operação não tem preço. Recomendo fortemente.',
      rating: 5
    },
  ];

  const mockups = [
    { title: 'Dashboard Principal', desc: 'Visão 360 da sua operação' },
    { title: 'Kanban de Projetos', desc: 'Gestão visual de tarefas' },
    { title: 'Calendário de Prazos', desc: 'Nunca perca uma deadline' },
    { title: 'CRM de Clientes', desc: 'Pipeline de oportunidades' },
    { title: 'Controladoria', desc: 'Andamentos em tempo real' },
    { title: 'Sistema Sob Medida', desc: 'Demandas específicas para áreas trabalhista, bancária, criminal, consumidor e cível, com calculadoras e IA' },
  ];

  const scrollToDemo = () => {
    document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white overflow-x-hidden">
      {/* Floating Particles Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-600/5 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0a0f1a]/80 border-b border-white/5">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => setShowEasterEgg(!showEasterEgg)}
            className="focus:outline-none"
          >
            <span className="text-3xl sm:text-4xl font-bold tracking-wider">
              <span className="bg-gradient-to-r from-gray-300 via-white to-blue-400 bg-clip-text text-transparent">VOUTI</span>
              <span className="text-red-500">.</span>
            </span>
          </button>
          
          {showEasterEgg && (
            <Input
              type="text"
              value={easterEggCode}
              onChange={(e) => setEasterEggCode(e.target.value)}
              onKeyDown={handleEasterEggSubmit}
              placeholder="..."
              className="w-32 h-8 text-xs bg-transparent border-white/10"
              autoFocus
            />
          )}

          <nav className="hidden md:flex items-center gap-8">
            <a href="#about" className="text-sm text-gray-400 hover:text-white transition-colors">Sobre</a>
            <a href="#modules" className="text-sm text-gray-400 hover:text-white transition-colors">Módulos</a>
            <a href="#benefits" className="text-sm text-gray-400 hover:text-white transition-colors">Benefícios</a>
            <a href="#testimonials" className="text-sm text-gray-400 hover:text-white transition-colors">Depoimentos</a>
          </nav>

          <Button 
            onClick={scrollToDemo}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-0"
          >
            Solicitar Demo
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a]/80 via-[#0a0f1a]/70 to-[#0a0f1a]" />
        </div>
        
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
                Gestão Jurídica
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Inteligente
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Automatize processos, organize prazos e potencialize resultados do seu escritório 
              com a plataforma mais completa do mercado.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={scrollToDemo}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-0 text-lg px-8 py-6 rounded-xl shadow-lg shadow-blue-500/25"
              >
                Solicitar Demonstração
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 text-lg px-8 py-6 rounded-xl"
                onClick={() => document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Conhecer Módulos
              </Button>
            </div>
          </div>
          
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Uma plataforma, <span className="text-cyan-400">toda sua operação</span>
            </h2>
            <p className="text-xl text-gray-400 leading-relaxed">
              A VOUTI integra todas as áreas de gestão do escritório jurídico em um 
              ambiente único, intuitivo e totalmente automatizado.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Scale, title: 'Centralização', desc: 'Todas as informações em um só lugar, acessíveis de qualquer dispositivo' },
              { icon: Zap, title: 'Automação', desc: 'Rotinas jurídicas automatizadas que economizam horas do seu dia' },
              { icon: BarChart3, title: 'Inteligência', desc: 'Dashboards e métricas que transformam dados em decisões estratégicas' },
            ].map((item, i) => (
              <div 
                key={i}
                className="group p-8 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-cyan-500/50 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Módulos <span className="text-cyan-400">Principais</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Cada módulo foi desenvolvido para resolver desafios específicos da advocacia moderna
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
            {modules.map((module, i) => (
              <div 
                key={i}
                className="group p-3 sm:p-6 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all duration-300"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-blue-500/30 transition-colors">
                  <module.icon className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-400" />
                </div>
                <h3 className="text-xs sm:text-base font-semibold mb-1 sm:mb-2">{module.title}</h3>
                <p className="text-[10px] sm:text-sm text-gray-400 line-clamp-2 sm:line-clamp-none">{module.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-transparent border border-blue-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
              <div className="relative">
                <Scale className="w-12 h-12 text-cyan-400 mb-6" />
                <p className="text-lg sm:text-xl leading-relaxed text-gray-200">
                  "A VOUTI foi criada para resolver os principais desafios dos escritórios de advocacia, 
                  trazendo <span className="text-cyan-400 font-semibold">organização, previsibilidade e automação</span>. 
                  O sistema centraliza informações, simplifica o controle financeiro, reduz riscos de perda de prazos, 
                  melhora a comunicação interna e oferece dashboards que metrificam toda a operação jurídica. 
                  Com módulos que abrangem desde o CRM até a controladoria, a VOUTI entrega 
                  <span className="text-cyan-400 font-semibold"> clareza, produtividade e gestão inteligente</span>."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Por que escolher a <span className="text-cyan-400">VOUTI</span>?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Benefícios reais que transformam a operação do seu escritório
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">
            {benefits.map((benefit, i) => (
              <div 
                key={i}
                className="group p-3 sm:p-6 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center shrink-0">
                    <benefit.icon className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-400" />
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-xs sm:text-base font-semibold mb-1 sm:mb-2">{benefit.title}</h3>
                    <p className="text-[10px] sm:text-sm text-gray-400 line-clamp-2 sm:line-clamp-none">{benefit.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Who Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Para quem é a <span className="text-cyan-400">VOUTI</span>?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Soluções adaptadas para cada perfil de atuação jurídica
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
            {personas.map((persona, i) => (
              <div 
                key={i}
                className="text-center p-4 sm:p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all"
              >
                <div className="w-10 h-10 sm:w-16 sm:h-16 mx-auto rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3 sm:mb-6">
                  <persona.icon className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-xs sm:text-base font-semibold mb-1 sm:mb-2">{persona.title}</h3>
                <p className="text-[10px] sm:text-sm text-gray-400 line-clamp-2 sm:line-clamp-none">{persona.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Demos Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Visualize o <span className="text-cyan-400">Sistema</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Interfaces modernas e intuitivas que facilitam o dia a dia
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {mockups.map((mockup, i) => (
              <div 
                key={i}
                className="group relative rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 min-h-[120px] sm:min-h-[140px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-cyan-500/20 to-blue-900/50" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 sm:p-4 text-center">
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-white/10 flex items-center justify-center mb-2 sm:mb-3">
                    <LayoutGrid className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-cyan-400" />
                  </div>
                  <h3 className="font-semibold text-[11px] sm:text-sm mb-1 sm:mb-2">{mockup.title}</h3>
                  <p className="text-[9px] sm:text-xs text-gray-400 leading-relaxed">{mockup.desc}</p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-transparent to-transparent opacity-60" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              O que nossos clientes <span className="text-cyan-400">dizem</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Escritórios que transformaram sua operação com a VOUTI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
            {testimonials.map((testimonial, i) => (
              <div 
                key={i}
                className="p-4 sm:p-8 rounded-xl sm:rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10"
              >
                <div className="flex gap-1 mb-3 sm:mb-6">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-base text-gray-300 mb-3 sm:mb-6 italic line-clamp-3 sm:line-clamp-none">"{testimonial.text}"</p>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-sm sm:text-lg font-bold">{testimonial.name[0]}</span>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-base font-semibold">{testimonial.name}</h4>
                    <p className="text-[10px] sm:text-sm text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="demo-section" className="py-20 relative">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="max-w-4xl mx-auto">
            <div className="p-4 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600/30 via-cyan-500/20 to-blue-900/30 border border-blue-500/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
              
              <div className="relative grid lg:grid-cols-2 gap-6 sm:gap-12 items-center">
                <div className="text-center lg:text-left">
                  <h2 className="text-xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
                    Transforme seu escritório com{' '}
                    <span className="text-cyan-400">gestão inteligente</span>
                  </h2>
                  <p className="text-gray-300 text-sm sm:text-lg mb-4 sm:mb-6">
                    Agende uma demonstração personalizada e descubra como a VOUTI 
                    pode revolucionar sua operação jurídica.
                  </p>
                  <ul className="space-y-2 sm:space-y-3 hidden sm:block">
                    {['Demonstração gratuita', 'Sem compromisso', 'Suporte especializado'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 justify-center lg:justify-start">
                        <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                        <span className="text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-white/10">
                  <h3 className="text-xl font-semibold mb-6 text-center">Agendar Demonstração</h3>
                  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Nome completo</label>
                      <Input 
                        placeholder="Seu nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        className="bg-white/5 border-white/10 focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">E-mail</label>
                      <Input 
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="bg-white/5 border-white/10 focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">WhatsApp</label>
                      <Input 
                        placeholder="(00) 00000-0000"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                        className="bg-white/5 border-white/10 focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Tamanho do escritório</label>
                      <select 
                        value={formData.tamanho}
                        onChange={(e) => setFormData({...formData, tamanho: e.target.value})}
                        className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="" className="bg-[#0a0f1a]">Selecione</option>
                        <option value="autonomo" className="bg-[#0a0f1a]">Advogado Autônomo</option>
                        <option value="pequeno" className="bg-[#0a0f1a]">1-5 advogados</option>
                        <option value="medio" className="bg-[#0a0f1a]">6-20 advogados</option>
                        <option value="grande" className="bg-[#0a0f1a]">20+ advogados</option>
                      </select>
                    </div>
                    <Button 
                      type="submit"
                      onClick={handleSubmitForm}
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-0 py-6"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : null}
                      Agendar Demonstracao Gratuita
                      {!isSubmitting && <ArrowRight className="ml-2 w-5 h-5" />}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid gap-4 mb-6">
            {/* Logo e descrição */}
            <div className="text-center">
              <span className="text-3xl font-bold tracking-wider">
                <span className="bg-gradient-to-r from-gray-300 via-white to-blue-400 bg-clip-text text-transparent">VOUTI</span>
                <span className="text-red-500">.</span>
              </span>
              <p className="mt-2 text-sm text-gray-400 max-w-md mx-auto">
                A plataforma mais completa para gestão de escritórios de advocacia.
              </p>
            </div>
            
            {/* Plataforma e Recursos em duas colunas */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="text-center">
                <h4 className="font-semibold mb-2">Plataforma</h4>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li><a href="#modules" className="hover:text-white transition-colors">Módulos</a></li>
                  <li><a href="#benefits" className="hover:text-white transition-colors">Benefícios</a></li>
                  <li><a href="#testimonials" className="hover:text-white transition-colors">Depoimentos</a></li>
                </ul>
              </div>
              
              <div className="text-center">
                <h4 className="font-semibold mb-2">Recursos</h4>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                </ul>
              </div>
            </div>
            
            {/* Contato centralizado */}
            <div className="text-center">
              <h4 className="font-semibold mb-2">Contato</h4>
              <a href="mailto:contato@vouti.co" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
                contato@vouti.co
              </a>
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/10 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} VOUTI. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
