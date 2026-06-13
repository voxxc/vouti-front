import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { supabasePublic } from '@/integrations/supabase/publicClient';
import { toast } from '@/hooks/use-toast';
import './LpIngles.css';

const leadSchema = z.object({
  nome: z.string().trim().min(2, 'Digite seu nome').max(80),
  telefone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length >= 10 && v.length <= 13, 'WhatsApp inválido'),
});

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return d;
};

// Hook simples para animação on-scroll
const useReveal = () => {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.lp-ingles .fade-up');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
};

const beneficios = [
  { titulo: 'Aulas 1 a 1', desc: 'Atenção total. Seu ritmo, seu objetivo, sua agenda.' },
  { titulo: 'Horário flexível', desc: 'De manhã, no almoço, à noite. Você escolhe.' },
  { titulo: 'Material sob medida', desc: 'Conversação, viagem, entrevistas, técnico. Tudo personalizado.' },
  { titulo: 'Online, ao vivo', desc: 'Zoom ou Google Meet — sem app, sem download.' },
];

const passos = [
  { n: '01', titulo: 'Diagnóstico', desc: 'Conversa de 20 min em português + inglês para entender seu nível e objetivo.' },
  { n: '02', titulo: 'Plano', desc: 'Montamos uma trilha com frequência e foco específico pra você.' },
  { n: '03', titulo: 'Aulas', desc: 'Você começa a falar inglês desde a primeira aula. Sem decoreba.' },
];

const depoimentos = [
  {
    texto: 'Em 3 meses eu já estava em call com cliente gringo. O foco em conversação foi divisor de águas.',
    autor: 'Mariana R.',
    cargo: 'Product Manager',
  },
  {
    texto: 'Aula 1 a 1 é outro patamar. A professora ajustava o ritmo no meio da aula quando precisava.',
    autor: 'Felipe T.',
    cargo: 'Engenheiro de software',
  },
];

const faqs = [
  { q: 'Quanto tempo dura cada aula?', a: '50 minutos, com 10 min opcionais de "english chat" no fim para soltar o idioma.' },
  { q: 'Quanto custa?', a: 'Os pacotes começam em R$ 280/mês (4 aulas). Conversamos sobre o melhor formato pra você no WhatsApp.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim. Sem multa, sem fidelidade. Pagamento mês a mês.' },
  { q: 'Os professores são nativos?', a: 'Temos professores brasileiros com C2 e nativos. Você escolhe — ambos com o mesmo método.' },
];

const LpIngles = () => {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  useReveal();

  useEffect(() => {
    document.title = 'Inglês 1 a 1 — sua primeira aula é hoje';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Aulas de inglês 1 a 1, online, com foco no seu objetivo. Comece com uma aula experimental.');
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = leadSchema.safeParse({ nome, telefone });
    if (!parsed.success) {
      toast({
        title: 'Verifique os dados',
        description: parsed.error.issues[0]?.message ?? 'Campos inválidos',
        variant: 'destructive',
      });
      return;
    }
    setEnviando(true);
    const { error } = await supabasePublic.from('landing_leads').insert({
      nome: parsed.data.nome,
      telefone: parsed.data.telefone,
      origem: 'lp-ingles',
      status: 'novo',
    });
    setEnviando(false);
    if (error) {
      toast({ title: 'Não foi possível enviar', description: error.message, variant: 'destructive' });
      return;
    }
    setEnviado(true);
    setNome('');
    setTelefone('');
    toast({ title: 'Recebido!', description: 'Em instantes você terá retorno no WhatsApp.' });
  };

  return (
    <div className="lp-ingles">
      {/* HERO */}
      <header className="px-5 pt-6 pb-2 max-w-screen-md mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="serif text-2xl">en</span>
            <span className="eyebrow">school 1:1</span>
          </div>
          <button onClick={scrollToForm} className="btn-outline" style={{ padding: '8px 14px', fontSize: 13 }}>
            Começar
          </button>
        </div>
      </header>

      <section className="px-5 pt-6 pb-12 max-w-screen-md mx-auto">
        <p className="eyebrow fade-up">Aulas particulares · Online · Ao vivo</p>
        <h1 className="mt-3 fade-up" style={{ fontSize: 'clamp(40px, 10vw, 64px)' }}>
          Inglês <span className="serif" style={{ fontStyle: 'italic', fontWeight: 500 }}>1 a 1</span>,
          <br />
          do seu jeito.
        </h1>
        <p className="mt-5 fade-up" style={{ fontSize: 17, maxWidth: 520 }}>
          Sem turma, sem app esquisito, sem decorar regra. Aula direta com professor pra você
          <span className="serif"> destravar de verdade</span> em poucas semanas.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row gap-3 fade-up">
          <button onClick={scrollToForm} className="btn-ink">Quero minha aula experimental →</button>
          <a href="#como" className="btn-outline" style={{ textDecoration: 'none', textAlign: 'center' }}>
            Como funciona
          </a>
        </div>

        <div className="mt-10 hero-art grain fade-up" />

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 fade-up" style={{ fontSize: 13, color: 'var(--muted)' }}>
          <span>★ 4.9 / 5 com 200+ alunos</span>
          <span>· Zoom / Meet</span>
          <span>· Professores certificados</span>
        </div>
      </section>

      <div className="px-5 max-w-screen-md mx-auto"><div className="rule" /></div>

      {/* BENEFÍCIOS */}
      <section className="px-5 py-14 max-w-screen-md mx-auto">
        <p className="eyebrow fade-up">Por que aqui</p>
        <h2 className="mt-3 fade-up" style={{ fontSize: 'clamp(28px, 7vw, 40px)' }}>
          Aula que <span className="serif">cabe</span> na sua semana.
        </h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {beneficios.map((b, i) => (
            <div key={i} className="card fade-up">
              <div className="serif" style={{ fontSize: 28, lineHeight: 1, color: 'var(--deep)' }}>
                0{i + 1}
              </div>
              <h3 className="mt-3" style={{ fontSize: 18 }}>{b.titulo}</h3>
              <p className="mt-1" style={{ fontSize: 14.5, color: 'var(--ink)' }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="px-5 max-w-screen-md mx-auto"><div className="rule" /></div>

      {/* COMO FUNCIONA */}
      <section id="como" className="px-5 py-14 max-w-screen-md mx-auto">
        <p className="eyebrow fade-up">Como funciona</p>
        <h2 className="mt-3 fade-up" style={{ fontSize: 'clamp(28px, 7vw, 40px)' }}>
          Três passos. <span className="serif">Zero</span> burocracia.
        </h2>
        <ol className="mt-8 space-y-6">
          {passos.map((p) => (
            <li key={p.n} className="fade-up flex gap-5 items-start">
              <div className="serif" style={{ fontSize: 40, lineHeight: 1, color: 'var(--deep)', minWidth: 60 }}>
                {p.n}
              </div>
              <div>
                <h3 style={{ fontSize: 20 }}>{p.titulo}</h3>
                <p className="mt-1" style={{ fontSize: 15 }}>{p.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="px-5 max-w-screen-md mx-auto"><div className="rule" /></div>

      {/* DEPOIMENTOS */}
      <section className="px-5 py-14 max-w-screen-md mx-auto">
        <p className="eyebrow fade-up">Quem já passou por aqui</p>
        <div className="mt-6 space-y-8">
          {depoimentos.map((d, i) => (
            <figure key={i} className="fade-up">
              <div className="serif" style={{ fontSize: 80, lineHeight: 0.6, color: 'var(--deep)' }}>“</div>
              <blockquote className="mt-3" style={{ fontSize: 20, lineHeight: 1.4, color: 'var(--deep)' }}>
                <span className="serif" style={{ fontStyle: 'italic' }}>{d.texto}</span>
              </blockquote>
              <figcaption className="mt-4" style={{ fontSize: 13, color: 'var(--muted)' }}>
                — {d.autor}, <span style={{ color: 'var(--ink)' }}>{d.cargo}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <div className="px-5 max-w-screen-md mx-auto"><div className="rule" /></div>

      {/* FAQ */}
      <section className="px-5 py-14 max-w-screen-md mx-auto">
        <p className="eyebrow fade-up">FAQ</p>
        <h2 className="mt-3 fade-up" style={{ fontSize: 'clamp(28px, 7vw, 40px)' }}>
          Dúvidas <span className="serif">frequentes</span>.
        </h2>
        <div className="mt-6">
          {faqs.map((f, i) => (
            <details key={i} className="fade-up">
              <summary>
                <span>{f.q}</span>
                <span className="chev" aria-hidden />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL + FORM */}
      <section ref={formRef} className="px-5 py-16 max-w-screen-md mx-auto">
        <div
          className="fade-up"
          style={{
            background: 'var(--deep)',
            color: 'var(--paper)',
            borderRadius: 8,
            padding: '36px 24px',
          }}
        >
          <p className="eyebrow" style={{ color: 'rgba(245,243,238,0.6)' }}>Aula experimental</p>
          <h2 style={{ fontSize: 'clamp(28px, 7vw, 38px)', color: 'var(--paper)', marginTop: 10 }}>
            Vamos marcar a <span className="serif" style={{ fontStyle: 'italic' }}>primeira</span>?
          </h2>
          <p style={{ marginTop: 10, opacity: 0.8, fontSize: 15 }}>
            Deixa seu nome e WhatsApp. Te chamamos em até 1 hora útil para alinhar horário.
          </p>

          {enviado ? (
            <div className="mt-6" style={{ background: 'rgba(245,243,238,0.08)', padding: 20, borderRadius: 6 }}>
              <h3 style={{ color: 'var(--paper)', fontSize: 20 }}>
                Recebido <span className="serif" style={{ fontStyle: 'italic' }}>obrigado!</span>
              </h3>
              <p style={{ fontSize: 14, opacity: 0.8, marginTop: 6 }}>
                Em instantes você terá retorno no WhatsApp informado.
              </p>
              <button
                onClick={() => setEnviado(false)}
                className="btn-outline"
                style={{ marginTop: 16, background: 'transparent', color: 'var(--paper)', borderColor: 'var(--paper)' }}
              >
                Enviar outro
              </button>
            </div>
          ) : (
            <form className="mt-6 space-y-3" onSubmit={onSubmit}>
              <input
                type="text"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={80}
                required
                aria-label="Nome"
              />
              <input
                type="tel"
                placeholder="WhatsApp (DDD + número)"
                value={telefone}
                onChange={(e) => setTelefone(formatPhone(e.target.value))}
                inputMode="numeric"
                required
                aria-label="WhatsApp"
              />
              <button
                type="submit"
                disabled={enviando}
                className="btn-ink"
                style={{ width: '100%', background: 'var(--paper)', color: 'var(--deep)', borderColor: 'var(--paper)' }}
              >
                {enviando ? 'Enviando…' : 'Quero minha aula experimental'}
              </button>
              <p style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
                Sem spam. Seus dados ficam só conosco.
              </p>
            </form>
          )}
        </div>
      </section>

      <footer className="px-5 py-10 max-w-screen-md mx-auto" style={{ fontSize: 12, color: 'var(--muted)' }}>
        <div className="rule" />
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>© {new Date().getFullYear()} — escola de inglês 1:1</span>
          <span className="serif">made with care.</span>
        </div>
      </footer>
    </div>
  );
};

export default LpIngles;