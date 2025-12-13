import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Scale, Shield, Users, ChevronDown, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LandingPage2 = () => {
  const { tenant, loading } = useTenant();
  const absoluteNavigate = useNavigate();
  const { navigate: tenantNavigate } = useTenantNavigation();
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    area: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [easterEggInput, setEasterEggInput] = useState('');
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  const [counters, setCounters] = useState({ cases: 0, years: 0, clients: 0, success: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const metricsSection = document.getElementById('metricas');
      if (metricsSection && !hasAnimated) {
        const rect = metricsSection.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.8) {
          setHasAnimated(true);
          animateCounters();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasAnimated]);

  const animateCounters = () => {
    const targets = { cases: 500, years: 15, clients: 200, success: 98 };
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setCounters({
        cases: Math.floor(targets.cases * progress),
        years: Math.floor(targets.years * progress),
        clients: Math.floor(targets.clients * progress),
        success: Math.floor(targets.success * progress)
      });
      if (step >= steps) clearInterval(timer);
    }, interval);
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.telefone.trim()) {
      toast.error('Preencha nome e telefone');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('leads_captacao').insert({
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        email: formData.email.trim() || null,
        tipo: formData.area || 'Nao especificado',
        origem: 'landing_page_2',
        tenant_id: tenant?.id || null
      });

      if (error) throw error;
      
      toast.success('Mensagem enviada com sucesso');
      setFormData({ nome: '', telefone: '', email: '', area: '' });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEasterEggSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = easterEggInput.toLowerCase().trim();
    
    if (code === 'jusvouti') {
      await supabase.auth.signOut();
      tenantNavigate('/auth');
    } else if (code === 'metal') {
      await supabase.auth.signOut();
      absoluteNavigate('/metal-auth');
    } else if (code === 'vlink') {
      await supabase.auth.signOut();
      absoluteNavigate('/link-auth');
    } else if (code === 'adm1nvouti') {
      absoluteNavigate('/super-admin');
    } else if (code === 'batink') {
      absoluteNavigate('/batink');
    } else if (code === 'veridicto') {
      absoluteNavigate('/veridicto');
    }
    
    setShowEasterEgg(false);
    setEasterEggInput('');
  };

  const pilares = [
    {
      icon: Scale,
      title: 'Excelencia Juridica',
      description: 'Atuacao estrategica com foco em resultados concretos'
    },
    {
      icon: Shield,
      title: 'Protecao Integral',
      description: 'Seguranca juridica para voce e seu patrimonio'
    },
    {
      icon: Users,
      title: 'Atendimento Exclusivo',
      description: 'Relacionamento proximo e personalizado'
    }
  ];

  const areas = [
    'Direito Civil',
    'Direito Empresarial',
    'Direito Trabalhista',
    'Direito de Familia',
    'Direito Imobiliario',
    'Outro'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c4a052] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const escritorioName = tenant?.name || 'Escritorio de Advocacia';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center items-center relative px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]" />
        
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="mb-8">
            <span className="text-[#c4a052] text-sm tracking-[0.3em] uppercase font-light">
              Advocacia de Excelencia
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight mb-8 leading-tight">
            {escritorioName}
          </h1>
          
          <p className="text-lg md:text-xl text-[#a0a0a0] font-light max-w-2xl mx-auto mb-12 leading-relaxed">
            Solucoes juridicas estrategicas com compromisso, etica e resultados.
          </p>
          
          <Button
            onClick={() => scrollToSection('contato')}
            className="bg-transparent border border-[#c4a052] text-[#c4a052] hover:bg-[#c4a052] hover:text-[#0a0a0a] px-10 py-6 text-sm tracking-widest uppercase transition-all duration-300 rounded-none"
          >
            Fale Conosco
          </Button>
        </div>

        <button
          onClick={() => scrollToSection('pilares')}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[#505050] hover:text-[#c4a052] transition-colors animate-bounce"
        >
          <ChevronDown size={32} strokeWidth={1} />
        </button>
      </section>

      {/* Pilares Section */}
      <section id="pilares" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-[#c4a052] text-sm tracking-[0.3em] uppercase font-light">
              Nossa Atuacao
            </span>
            <h2 className="text-3xl md:text-4xl font-light mt-4">
              Pilares do Escritorio
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-16">
            {pilares.map((pilar, index) => (
              <div 
                key={index} 
                className="text-center group"
              >
                <div className="mb-8 inline-flex items-center justify-center w-16 h-16 border border-[#262626] group-hover:border-[#c4a052] transition-colors duration-300">
                  <pilar.icon size={28} strokeWidth={1} className="text-[#c4a052]" />
                </div>
                <h3 className="text-xl font-light mb-4 tracking-wide">
                  {pilar.title}
                </h3>
                <p className="text-[#707070] font-light leading-relaxed">
                  {pilar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metricas Section */}
      <section id="metricas" className="py-32 px-6 bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-light text-[#c4a052] mb-2">
                +{counters.cases}
              </div>
              <div className="text-sm text-[#707070] tracking-widest uppercase">
                Casos Atendidos
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-light text-[#c4a052] mb-2">
                {counters.years}
              </div>
              <div className="text-sm text-[#707070] tracking-widest uppercase">
                Anos de Atuacao
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-light text-[#c4a052] mb-2">
                +{counters.clients}
              </div>
              <div className="text-sm text-[#707070] tracking-widest uppercase">
                Clientes Ativos
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-light text-[#c4a052] mb-2">
                {counters.success}%
              </div>
              <div className="text-sm text-[#707070] tracking-widest uppercase">
                Taxa de Sucesso
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contato Section */}
      <section id="contato" className="py-32 px-6">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#c4a052] text-sm tracking-[0.3em] uppercase font-light">
              Contato
            </span>
            <h2 className="text-3xl md:text-4xl font-light mt-4">
              Fale Conosco
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="text"
              placeholder="Nome completo"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="bg-transparent border-[#262626] focus:border-[#c4a052] text-[#fafafa] placeholder:text-[#505050] h-14 rounded-none"
            />
            
            <Input
              type="tel"
              placeholder="Telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              className="bg-transparent border-[#262626] focus:border-[#c4a052] text-[#fafafa] placeholder:text-[#505050] h-14 rounded-none"
            />
            
            <Input
              type="email"
              placeholder="E-mail (opcional)"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-transparent border-[#262626] focus:border-[#c4a052] text-[#fafafa] placeholder:text-[#505050] h-14 rounded-none"
            />
            
            <Select
              value={formData.area}
              onValueChange={(value) => setFormData({ ...formData, area: value })}
            >
              <SelectTrigger className="bg-transparent border-[#262626] focus:border-[#c4a052] text-[#fafafa] h-14 rounded-none [&>span]:text-[#505050] data-[state=open]:border-[#c4a052]">
                <SelectValue placeholder="Area de interesse" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#262626] rounded-none">
                {areas.map((area) => (
                  <SelectItem 
                    key={area} 
                    value={area}
                    className="text-[#fafafa] focus:bg-[#262626] focus:text-[#c4a052]"
                  >
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#c4a052] text-[#0a0a0a] hover:bg-[#d4b062] h-14 text-sm tracking-widest uppercase transition-all duration-300 disabled:opacity-50 rounded-none"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-light tracking-wide mb-2">
                {escritorioName}
              </h3>
              <p className="text-[#505050] text-sm">
                Advocacia de Excelencia
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6 text-sm text-[#707070]">
              <a href="tel:+5500000000000" className="flex items-center gap-2 hover:text-[#c4a052] transition-colors">
                <Phone size={14} strokeWidth={1} />
                (00) 0000-0000
              </a>
              <a href="mailto:contato@escritorio.com" className="flex items-center gap-2 hover:text-[#c4a052] transition-colors">
                <Mail size={14} strokeWidth={1} />
                contato@escritorio.com
              </a>
              <span className="flex items-center gap-2">
                <MapPin size={14} strokeWidth={1} />
                Cidade, Estado
              </span>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-[#1a1a1a] flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#505050]">
            <p>&copy; {new Date().getFullYear()} {escritorioName}. Todos os direitos reservados.</p>
            <button
              onClick={() => setShowEasterEgg(true)}
              className="opacity-0 hover:opacity-100 transition-opacity text-[#303030]"
            >
              .
            </button>
          </div>
        </div>
      </footer>

      {/* Easter Egg Modal */}
      {showEasterEgg && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
          onClick={() => setShowEasterEgg(false)}
        >
          <form 
            onSubmit={handleEasterEggSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1a1a1a] p-8 border border-[#262626] max-w-sm w-full"
          >
            <Input
              type="password"
              placeholder="Codigo de acesso"
              value={easterEggInput}
              onChange={(e) => setEasterEggInput(e.target.value)}
              autoFocus
              className="bg-transparent border-[#262626] focus:border-[#c4a052] text-[#fafafa] placeholder:text-[#505050] rounded-none"
            />
            <Button 
              type="submit"
              className="w-full mt-4 bg-[#c4a052] text-[#0a0a0a] hover:bg-[#d4b062] rounded-none"
            >
              Acessar
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default LandingPage2;
