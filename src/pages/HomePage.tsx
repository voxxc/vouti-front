import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createLandingLead } from '@/hooks/useLandingLeads';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Key, Loader2, ArrowRight, CheckCircle2, XCircle, Mail } from 'lucide-react';
import showcaseProcessos from '@/assets/showcase-processos.png';
import showcaseFinanceiro from '@/assets/showcase-financeiro.png';
import showcasePrazos from '@/assets/showcase-prazos.png';
import heroComputer from '@/assets/hero-computer.png';

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

  // Scroll animations
  const heroAnim = useScrollAnimation(0.1);
  const featuresAnim = useScrollAnimation(0.1);
  const showcase1Anim = useScrollAnimation(0.1);
  const showcase2Anim = useScrollAnimation(0.1);
  const showcase3Anim = useScrollAnimation(0.1);
  const statementAnim = useScrollAnimation(0.1);
  const plansAnim = useScrollAnimation(0.1);
  const formAnim = useScrollAnimation(0.1);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast({
        title: 'Campo obrigatório',
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
        title: 'Solicitação enviada!',
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
      
      if (code === 'jusvouti' || code === 'solvenza') {
        await supabase.auth.signOut();
        sessionStorage.setItem('selectedTenant', 'solvenza');
        navigate('/solvenza/auth');
      } else if (code === 'cordeiro') {
        await supabase.auth.signOut();
        sessionStorage.setItem('selectedTenant', 'cordeiro');
        navigate('/cordeiro/auth');
      } else if (code === 'teste') {
        await supabase.auth.signOut();
        sessionStorage.setItem('selectedTenant', 'teste');
        navigate('/teste/auth');
      } else if (code === 'advams') {
        await supabase.auth.signOut();
        sessionStorage.setItem('selectedTenant', 'advams');
        navigate('/advams/auth');
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

  const features = [
    'Controle de Prazos',
    'Kanban de Projetos',
    'Gestão de Clientes',
    'Controle Financeiro',
    'Andamentos Processuais',
    'Gestão de Equipes',
    'CRM c/ WhatsApp + IA',
    'Agendamento de Reuniões',
    'Monitoramento CPF/CNPJ',
    'Gestão de Tokens 2FA',
    'Módulos Exclusivos',
    'Documentos Inteligentes',
  ];

  const showcaseSections = [
    {
      title: 'Acompanhe seus processos e publicações em tempo real',
      description: 'Monitore automaticamente por OAB e CNPJ. Receba notificações de intimações e movimentações diretamente na plataforma, reduzindo falhas e atrasos.',
      bullets: [
        'Monitoramento automático por número OAB/CNPJ',
        'Alertas instantâneos de novas publicações',
        'Histórico completo de movimentações'
      ],
      image: showcaseProcessos,
      imageLeft: true,
      extraScale: false,
    },
    {
      title: 'Gestão financeira integrada e profissional',
      description: 'Controle honorários, fluxo de caixa e parcelas em um único painel. Acompanhe pagamentos, gere relatórios e nunca perca um vencimento.',
      bullets: [
        'Controle de honorários e parcelas automatizado',
        'Fluxo de caixa com visão consolidada',
        'Lembretes de pagamentos e cobranças'
      ],
      image: showcaseFinanceiro,
      imageLeft: false,
      extraScale: false,
    },
    {
      title: 'Organize prazos e tarefas em um só lugar',
      description: 'Centralize sua agenda jurídica com alertas automáticos. Distribua tarefas, acompanhe a produtividade da equipe e nunca perca um prazo fatal.',
      bullets: [
        'Alertas automáticos de prazos processuais',
        'Agenda centralizada com visão por equipe',
        'Distribuição inteligente de tarefas'
      ],
      image: showcasePrazos,
      imageLeft: true,
      extraScale: true,
    },
  ];

  const plans = [
    { 
      name: 'Solo', 
      price: 99, 
      processes: 30, 
      usersLabel: '1 usuário',
      oabLabel: 'Até 1 OAB cadastrada',
      popular: false,
      unlimitedProcesses: false,
      hasCRM: false
    },
    { 
      name: 'Essencial', 
      price: 200, 
      processes: 100, 
      usersLabel: '3 usuários',
      oabLabel: 'Até 2 OABs cadastradas',
      popular: false,
      unlimitedProcesses: false,
      hasCRM: false
    },
    { 
      name: 'Estrutura', 
      price: 400, 
      processes: 200, 
      usersLabel: '10 usuários',
      oabLabel: 'Até 3 OABs cadastradas',
      popular: true,
      unlimitedProcesses: true,
      hasCRM: true
    },
    { 
      name: 'Expansão', 
      price: 600, 
      processes: 400, 
      usersLabel: 'Usuários ilimitados',
      oabLabel: 'OABs personalizado',
      popular: false,
      unlimitedProcesses: true,
      hasCRM: true
    },
    { 
      name: 'Enterprise', 
      price: 1000, 
      processes: 800, 
      usersLabel: 'Usuários ilimitados',
      oabLabel: 'OABs personalizado',
      popular: false,
      unlimitedProcesses: true,
      hasCRM: true
    },
  ];

  const scrollToDemo = () => {
    document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const showcaseAnims = [showcase1Anim, showcase2Anim, showcase3Anim];

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a] overflow-x-hidden">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl font-black tracking-tight">
              Vou<span className="text-[#E11D48]">ti</span><span className="text-[#E11D48]">.</span>
            </span>
            
            <button 
              onClick={() => setShowEasterEgg(!showEasterEgg)}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors opacity-20 hover:opacity-60"
              title="Acesso rápido"
            >
              <Key className="w-4 h-4 text-gray-400" />
            </button>
            
            {showEasterEgg && (
              <Input
                type="text"
                value={easterEggCode}
                onChange={(e) => setEasterEggCode(e.target.value)}
                onKeyDown={handleEasterEggSubmit}
                placeholder="Código..."
                className="w-36 h-8 text-xs border-gray-300 text-[#0a0a0a] placeholder:text-gray-400"
                autoFocus
              />
            )}
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-500 hover:text-[#0a0a0a] transition-colors">Módulos</a>
            <a href="#plans" className="text-sm text-gray-500 hover:text-[#0a0a0a] transition-colors">Planos</a>
            <a href="#demo-section" className="text-sm text-gray-500 hover:text-[#0a0a0a] transition-colors">Contato</a>
          </nav>

          <Button 
            onClick={scrollToDemo}
            className="bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] border-0 rounded-lg text-sm px-6"
          >
            Solicitar Demo
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 sm:pt-40 sm:pb-28 relative">
        <div className="container mx-auto px-6">
          <div 
            ref={heroAnim.ref}
            className={`grid grid-cols-1 lg:grid-cols-2 gap-10 items-center transition-all duration-700 ease-out ${heroAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {/* Text */}
            <div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight mb-8">
                O seu<br />
                escritório<br />
                <span className="text-[#E11D48]">360.</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-500 max-w-xl mb-10 leading-relaxed">
                Gestão jurídica completa em uma única plataforma. 
                Prazos, financeiro, clientes e equipe — tudo sob controle.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={scrollToDemo}
                  className="bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] border-0 text-base px-8 py-6 rounded-lg"
                >
                  Solicitar Demonstração
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  variant="outline"
                  className="border-gray-300 text-[#0a0a0a] hover:bg-gray-50 text-base px-8 py-6 rounded-lg"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Ver Módulos
                </Button>
              </div>
            </div>

            {/* Computer Image - overlaps the divider line */}
            <div className="relative z-10 mb-[-120px] lg:mb-[-160px]">
              <img 
                src={heroComputer} 
                alt="Vouti Dashboard" 
                className="w-full h-auto object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>

        {/* Divider line - sits behind the computer */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-200 z-0" />
      </section>

      {/* Spacer to account for overlapping computer */}
      <div className="h-[120px] lg:h-[160px] bg-white" />

      {/* Features Grid */}
      <section id="features" className="py-20 sm:py-28">
        <div className="container mx-auto px-6">
          <div 
            ref={featuresAnim.ref}
            className={`max-w-4xl transition-all duration-700 ease-out delay-100 ${featuresAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-12">
              Tudo que seu escritório precisa.
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-5">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-[#E11D48] text-2xl leading-none">•</span>
                  <span className="text-lg sm:text-xl font-semibold text-[#0a0a0a]">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Showcase Sections */}
      {showcaseSections.map((section, i) => {
        const anim = showcaseAnims[i];
        const isEven = i % 2 === 0;
        return (
          <section 
            key={i} 
            className={`py-20 sm:py-28 ${isEven ? 'bg-gray-50' : 'bg-white'} border-t border-gray-200`}
          >
            <div className="container mx-auto px-6">
              <div 
                ref={anim.ref}
                className={`grid grid-cols-1 lg:grid-cols-7 gap-10 lg:gap-12 items-center transition-all duration-700 ease-out ${anim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              >
                {/* Image */}
                <div className={`lg:col-span-4 ${section.imageLeft ? 'lg:order-1' : 'lg:order-2'}`}>
                <div className="overflow-hidden">
                    <img 
                      src={section.image} 
                      alt={section.title}
                      className={`w-full h-auto object-contain ${section.extraScale ? 'scale-[1.2] origin-center' : ''}`}
                      style={isEven ? { backgroundColor: '#f9fafb' } : { backgroundColor: '#ffffff' }}
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Text */}
                <div className={`lg:col-span-3 ${section.imageLeft ? 'lg:order-2' : 'lg:order-1'}`}>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-5 leading-tight">
                    {section.title}
                  </h3>
                  <p className="text-gray-500 text-base sm:text-lg mb-8 leading-relaxed">
                    {section.description}
                  </p>
                  <ul className="space-y-4 mb-8">
                    {section.bullets.map((bullet, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#E11D48] shrink-0 mt-0.5" />
                        <span className="text-[#0a0a0a] font-medium">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <button 
                    onClick={scrollToDemo}
                    className="text-[#E11D48] font-semibold text-sm hover:underline inline-flex items-center gap-1"
                  >
                    Saiba mais <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* Statement */}
      <section className="py-20 sm:py-28 border-t border-gray-200">
        <div className="container mx-auto px-6">
          <div 
            ref={statementAnim.ref}
            className={`transition-all duration-700 ease-out ${statementAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
              Transforme<br />
              seu escritório.
            </h2>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="py-20 sm:py-28 border-t border-gray-200">
        <div className="container mx-auto px-6">
          <div
            ref={plansAnim.ref}
            className={`transition-all duration-700 ease-out ${plansAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
              Planos
            </h2>
            <p className="text-gray-500 text-lg mb-12 max-w-xl">
              Escolha o plano ideal para o tamanho do seu escritório.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {plans.map((plan, i) => (
                <div 
                  key={i}
                  className={`relative rounded-xl p-6 border transition-all duration-300 hover:scale-[1.02] ${
                    plan.popular 
                      ? 'border-[#0a0a0a] border-2 shadow-lg' 
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 text-xs font-bold bg-[#0a0a0a] text-white rounded-full">
                        Popular
                      </span>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-lg font-bold mb-3">{plan.name}</h3>
                    
                    <div className="mb-4">
                      <span className="text-3xl font-black text-[#0a0a0a]">
                        R$ {plan.price.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-sm text-gray-500">/mês</span>
                    </div>

                    <div className="inline-block px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium mb-5">
                      {plan.usersLabel}
                    </div>

                    <ul className="space-y-2.5 mb-6">
                      <li className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-[#E11D48] shrink-0 mt-0.5" />
                        Monitoramento de até {plan.processes} processos
                      </li>
                      <li className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-[#E11D48] shrink-0 mt-0.5" />
                        {plan.oabLabel}
                      </li>
                      <li className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-[#E11D48] shrink-0 mt-0.5" />
                        Kanban, Relatórios, Financeiro
                      </li>
                      <li className={`flex items-start gap-2 text-sm ${plan.hasCRM ? 'text-gray-600' : 'text-gray-400'}`}>
                        {plan.hasCRM ? (
                          <CheckCircle2 className="w-4 h-4 text-[#E11D48] shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                        )}
                        CRM + Landing Page
                      </li>
                      <li className={`flex items-start gap-2 text-sm ${plan.unlimitedProcesses ? 'text-gray-600' : 'text-gray-400'}`}>
                        {plan.unlimitedProcesses ? (
                          <CheckCircle2 className="w-4 h-4 text-[#E11D48] shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                        )}
                        Processos ilimitados
                      </li>
                    </ul>

                    <Button
                      onClick={scrollToDemo}
                      className={`w-full rounded-lg ${
                        plan.popular 
                          ? 'bg-[#0a0a0a] text-white hover:bg-[#1a1a1a]' 
                          : 'bg-white text-[#0a0a0a] border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Selecionar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">* Plano personalizado disponível — fale com nosso time.</p>
          </div>
        </div>
      </section>

      {/* CTA / Form */}
      <section id="demo-section" className="py-20 sm:py-28 bg-gray-50">
        <div className="container mx-auto px-6">
          <div 
            ref={formAnim.ref}
            className={`max-w-2xl mx-auto transition-all duration-700 ease-out ${formAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 text-center">
              Solicitar Demo
            </h2>
            <p className="text-gray-500 text-center mb-10">
              Preencha abaixo e nossa equipe entrará em contato.
            </p>

            <form className="space-y-4" onSubmit={handleSubmitForm}>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nome completo</label>
                <Input 
                  placeholder="Seu nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className="border-gray-300 bg-white text-[#0a0a0a] placeholder:text-gray-400 h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">E-mail</label>
                <Input 
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="border-gray-300 bg-white text-[#0a0a0a] placeholder:text-gray-400 h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">WhatsApp</label>
                <Input 
                  placeholder="(00) 00000-0000"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                  className="border-gray-300 bg-white text-[#0a0a0a] placeholder:text-gray-400 h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tamanho do escritório</label>
                <select 
                  value={formData.tamanho}
                  onChange={(e) => setFormData({...formData, tamanho: e.target.value})}
                  className="w-full h-12 px-3 rounded-md bg-white border border-gray-300 text-[#0a0a0a] focus:border-[#0a0a0a] focus:outline-none focus:ring-1 focus:ring-[#0a0a0a]"
                >
                  <option value="">Selecione</option>
                  <option value="autonomo">Advogado Autônomo</option>
                  <option value="pequeno">1-5 advogados</option>
                  <option value="medio">6-20 advogados</option>
                  <option value="grande">20+ advogados</option>
                </select>
              </div>
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] border-0 h-12 text-base rounded-lg mt-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : null}
                Agendar Demonstração
                {!isSubmitting && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 bg-white">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xl font-black tracking-tight">
            Vou<span className="text-[#E11D48]">ti</span><span className="text-[#E11D48]">.</span>
          </span>
          <a href="mailto:contato@vouti.co" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#0a0a0a] transition-colors">
            <Mail className="w-4 h-4" />
            contato@vouti.co
          </a>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} VOUTI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
