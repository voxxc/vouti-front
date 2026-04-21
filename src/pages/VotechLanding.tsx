import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Wallet, Users, PieChart, Bell, Shield, Sparkles,
  ArrowRight, Check, User, Heart, ChevronDown, TrendingUp, TrendingDown,
} from 'lucide-react';

const FONT_STACK = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, system-ui, sans-serif';

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------- iPhone mockup (CSS only) ---------- */
function PhoneMockup({ variant = 'solo' }: { variant?: 'solo' | 'couple' }) {
  return (
    <div className="relative mx-auto w-[260px] sm:w-[300px] aspect-[9/19] rounded-[44px] bg-black p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]">
      {/* notch */}
      <div className="absolute left-1/2 -translate-x-1/2 top-3 w-24 h-6 rounded-full bg-black z-20" />
      <div className="relative w-full h-full rounded-[34px] overflow-hidden bg-[#F5F5F7]">
        {/* status bar */}
        <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[10px] font-semibold text-black/80">
          <span>9:41</span>
          <span>•••</span>
        </div>

        {/* greeting */}
        <div className="px-5 mt-2">
          <p className="text-[11px] text-black/50">Olá,</p>
          <p className="text-[15px] font-semibold text-black tracking-tight">
            {variant === 'couple' ? 'Você & Maria' : 'Felipe'}
          </p>
        </div>

        {/* balance card */}
        <div className="mx-4 mt-3 rounded-2xl p-4 bg-gradient-to-br from-black to-[#1c1c1e] text-white">
          <p className="text-[10px] uppercase tracking-wider text-white/60">Saldo do mês</p>
          <p className="text-2xl font-bold tabular-nums mt-1">R$ 4.820,15</p>
          <div className="flex gap-2 mt-3">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#30D158]/20 text-[#30D158]">+ R$ 7.200</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF453A]/20 text-[#FF8A82]">- R$ 2.380</span>
          </div>
          {variant === 'couple' && (
            <div className="flex items-center gap-1.5 mt-3">
              <div className="w-5 h-5 rounded-full bg-[#30D158] border-2 border-black" />
              <div className="w-5 h-5 rounded-full bg-[#0A84FF] -ml-2 border-2 border-black" />
              <span className="text-[9px] text-white/60 ml-1">Compartilhado</span>
            </div>
          )}
        </div>

        {/* list */}
        <div className="px-4 mt-4 space-y-2">
          {[
            { l: 'Mercado', v: '- R$ 320,00', c: '#FF453A' },
            { l: 'Salário', v: '+ R$ 6.500,00', c: '#30D158' },
            { l: 'Conta de luz', v: '- R$ 180,00', c: '#FF453A' },
            { l: 'Freelance', v: '+ R$ 700,00', c: '#30D158' },
          ].map((it) => (
            <div key={it.l} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full" style={{ backgroundColor: it.c + '22' }}>
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold" style={{ color: it.c }}>{it.l[0]}</div>
                </div>
                <span className="text-[11px] text-black font-medium">{it.l}</span>
              </div>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: it.c }}>{it.v}</span>
            </div>
          ))}
        </div>

        {/* tab bar */}
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-xl border-t border-black/5 flex justify-around items-center">
          {['📊', '💰', '＋', '💸', '📄'].map((e, i) => (
            <div key={i} className={`text-[16px] ${i === 2 ? 'w-8 h-8 rounded-full bg-[#30D158] text-white flex items-center justify-center text-base' : ''}`}>
              {e}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VotechLanding() {
  useEffect(() => {
    document.title = 'VoTech — Suas finanças. Em paz.';
    const meta = document.querySelector('meta[name="description"]');
    const desc = 'VoTech: app de finanças pessoais e para casais. Organize receitas, despesas e contas com a calma de um Sábado.';
    if (meta) meta.setAttribute('content', desc);
    else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-black" style={{ fontFamily: FONT_STACK }}>
      {/* nav */}
      <header className="sticky top-0 z-50 bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-6xl mx-auto px-5 h-12 flex items-center justify-between">
          <Link to="/votech" className="flex items-center gap-1.5">
            <span className="text-[15px] font-semibold tracking-tight">Vo</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#30D158]" />
            <span className="text-[15px] font-semibold tracking-tight">tech</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-[12px] text-black/70">
            <a href="#para-voce" className="hover:text-black transition-colors">Para você</a>
            <a href="#features" className="hover:text-black transition-colors">Recursos</a>
            <a href="#privacidade" className="hover:text-black transition-colors">Privacidade</a>
            <a href="#faq" className="hover:text-black transition-colors">FAQ</a>
          </nav>
          <Link to="/votech/auth" className="text-[12px] font-medium text-black hover:text-[#30D158] transition-colors">
            Entrar →
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden pt-16 sm:pt-24 pb-20 sm:pb-32 px-5">
        {/* mesh gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#30D158]/10 blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full bg-[#0A84FF]/10 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-black/60 bg-white/80 backdrop-blur px-3 py-1 rounded-full border border-black/5">
              <Sparkles className="w-3 h-3 text-[#30D158]" /> Novo · Web · iOS em breve
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mt-6 text-5xl sm:text-7xl md:text-8xl font-semibold tracking-tight leading-[0.95]">
              Suas finanças.
              <br />
              <span className="bg-gradient-to-br from-[#30D158] to-[#0A84FF] bg-clip-text text-transparent">Em paz.</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-6 text-lg sm:text-xl text-black/60 max-w-2xl mx-auto leading-relaxed">
              VoTech organiza receitas, despesas e contas — sozinho ou com quem você ama.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link to="/votech/auth">
                <Button className="h-12 px-7 rounded-full bg-black hover:bg-black/85 text-white text-[14px] font-medium shadow-lg shadow-black/10">
                  Começar grátis <ArrowRight className="ml-1.5 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/votech/auth">
                <Button variant="ghost" className="h-12 px-7 rounded-full bg-white hover:bg-white/80 text-black text-[14px] font-medium border border-black/10">
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </Reveal>

          {/* phone */}
          <Reveal delay={500} className="mt-16 sm:mt-20">
            <PhoneMockup variant="solo" />
          </Reveal>
        </div>
      </section>

      {/* PARA VOCÊ / PARA VOCÊS */}
      <section id="para-voce" className="py-20 sm:py-28 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight text-center mb-3">
              Para você. <span className="text-black/40">Para vocês.</span>
            </h2>
            <p className="text-center text-black/60 text-base sm:text-lg max-w-2xl mx-auto">
              Use sozinho ou compartilhe com sua pessoa. O VoTech se adapta ao seu jeito de cuidar do dinheiro.
            </p>
          </Reveal>

          <div className="mt-16 grid md:grid-cols-2 gap-6">
            {/* Solo */}
            <Reveal>
              <div className="rounded-3xl bg-[#F5F5F7] p-8 sm:p-10 h-full">
                <div className="w-11 h-11 rounded-full bg-black flex items-center justify-center mb-6">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">Solo</h3>
                <p className="text-black/60 text-[15px] leading-relaxed mb-8">
                  Categorize seus gastos, acompanhe seu saldo e crie objetivos. Tudo no seu ritmo.
                </p>
                <div className="flex justify-center"><PhoneMockup variant="solo" /></div>
              </div>
            </Reveal>
            {/* Casal */}
            <Reveal delay={100}>
              <div className="rounded-3xl bg-gradient-to-br from-[#30D158]/15 via-[#F5F5F7] to-[#0A84FF]/15 p-8 sm:p-10 h-full relative overflow-hidden">
                <span className="absolute top-6 right-6 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black text-white">Em breve</span>
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#30D158] to-[#0A84FF] flex items-center justify-center mb-6">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">Casal · Família</h3>
                <p className="text-black/60 text-[15px] leading-relaxed mb-8">
                  Compartilhe contas, divida gastos e veja o orçamento da casa em uma única tela.
                </p>
                <div className="flex justify-center"><PhoneMockup variant="couple" /></div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 sm:py-28 px-5">
        <div className="max-w-5xl mx-auto space-y-32 sm:space-y-44">
          {[
            {
              icon: PieChart,
              tag: 'Categorização',
              title: 'Veja para onde foi cada real.',
              text: 'Categorize automaticamente e descubra padrões nos seus gastos. Sem planilhas, sem dor de cabeça.',
              accent: '#30D158',
            },
            {
              icon: Bell,
              tag: 'Lembretes',
              title: 'Nunca mais esqueça uma conta.',
              text: 'Contas a pagar e a receber com status visual e alertas no momento certo.',
              accent: '#FF9F0A',
            },
            {
              icon: TrendingUp,
              tag: 'Relatórios',
              title: 'Relatórios que você entende.',
              text: 'Gráficos limpos, comparativos mensais e o resultado real do seu mês — tudo em segundos.',
              accent: '#0A84FF',
            },
          ].map((f, i) => (
            <Reveal key={f.title}>
              <div className={`grid md:grid-cols-2 gap-10 sm:gap-16 items-center ${i % 2 ? 'md:[&>*:first-child]:order-last' : ''}`}>
                <div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: f.accent + '20' }}>
                    <f.icon className="w-6 h-6" style={{ color: f.accent }} />
                  </div>
                  <p className="text-[12px] font-medium uppercase tracking-wider text-black/40 mb-3">{f.tag}</p>
                  <h3 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-tight mb-5">{f.title}</h3>
                  <p className="text-black/60 text-base sm:text-lg leading-relaxed">{f.text}</p>
                </div>
                <div className="flex justify-center">
                  <div className="w-full max-w-sm aspect-square rounded-3xl bg-gradient-to-br from-white to-[#F5F5F7] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] flex items-center justify-center p-8">
                    <f.icon className="w-32 h-32" style={{ color: f.accent, opacity: 0.85 }} strokeWidth={1.2} />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PRIVACIDADE */}
      <section id="privacidade" className="py-20 sm:py-28 px-5 bg-black text-white">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <Shield className="w-12 h-12 mx-auto text-[#30D158] mb-6" strokeWidth={1.5} />
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight mb-5">Seus dados são seus.</h2>
            <p className="text-white/60 text-base sm:text-lg leading-relaxed">
              Criptografia em trânsito e em repouso. Você pode exportar ou apagar tudo a qualquer momento — sem perguntas.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {['Sem venda de dados', 'Exportação completa', 'Exclusão imediata', 'Criptografia AES-256'].map((t) => (
                <span key={t} className="text-[12px] px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/80 inline-flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-[#30D158]" /> {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 sm:py-28 px-5">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-center mb-12">Perguntas frequentes</h2>
          </Reveal>
          <Reveal delay={100}>
            <Accordion type="single" collapsible className="space-y-3">
              {[
                { q: 'O VoTech é grátis?', a: 'Sim, a versão atual é gratuita para uso pessoal. Planos avançados virão em breve, sempre com período gratuito generoso.' },
                { q: 'Posso usar com meu parceiro(a)?', a: 'Estamos finalizando a feature de conta compartilhada para casais e famílias. Crie sua conta agora e você terá acesso assim que liberada.' },
                { q: 'O VoTech importa dados do meu banco?', a: 'A importação manual já funciona (CSV). Integração direta com bancos via Open Finance está no roadmap.' },
                { q: 'Funciona offline?', a: 'A versão web exige conexão. O app iOS, em breve, terá modo offline com sincronização automática.' },
                { q: 'Meus dados estão seguros?', a: 'Sim. Usamos criptografia em trânsito (TLS) e em repouso (AES-256). Você é o único dono dos seus dados.' },
              ].map((f, i) => (
                <AccordionItem key={i} value={`f${i}`} className="bg-white rounded-2xl border-0 px-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                  <AccordionTrigger className="text-left text-[15px] font-medium hover:no-underline py-4">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-black/60 text-[14px] leading-relaxed pb-5">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 sm:py-28 px-5 bg-gradient-to-br from-[#30D158]/10 via-[#F5F5F7] to-[#0A84FF]/10">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight mb-5">
              Comece a respirar<br />tranquilo hoje.
            </h2>
            <p className="text-black/60 text-lg mb-9">É grátis. Leva menos de um minuto.</p>
            <Link to="/votech/auth">
              <Button className="h-13 px-8 rounded-full bg-black hover:bg-black/85 text-white text-[15px] font-medium shadow-xl">
                Criar minha conta <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-black/5 py-12 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-[12px] text-black/50">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold tracking-tight text-black">Vo</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#30D158]" />
            <span className="font-semibold tracking-tight text-black">tech</span>
            <span className="ml-3">© {new Date().getFullYear()} Vouti</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/" className="hover:text-black transition-colors">Vouti</Link>
            <Link to="/crm" className="hover:text-black transition-colors">Vouti.CRM</Link>
            <Link to="/linkbio" className="hover:text-black transition-colors">vouti.co/bio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}