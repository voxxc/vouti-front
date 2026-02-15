import { useState, useEffect } from 'react';

const testimonials = [
  {
    name: 'Dr. Ricardo Almeida',
    office: 'Almeida & Associados',
    city: 'São Paulo, SP',
    text: 'Reduzimos em 70% o tempo gasto com controle de prazos. A equipe finalmente respira.',
  },
  {
    name: 'Dra. Camila Ferreira',
    office: 'Ferreira Advocacia',
    city: 'Belo Horizonte, MG',
    text: 'Nosso financeiro nunca foi tão organizado. Consigo ver tudo em um só lugar.',
  },
  {
    name: 'Dr. Thiago Nascimento',
    office: 'TN Advogados',
    city: 'Curitiba, PR',
    text: 'A captação de leads triplicou depois que começamos a usar o painel de prospecção.',
  },
  {
    name: 'Dra. Juliana Costa',
    office: 'Costa & Barros',
    city: 'Rio de Janeiro, RJ',
    text: 'Simples, bonito e funcional. Exatamente o que um escritório moderno precisa.',
  },
  {
    name: 'Dr. Eduardo Lima',
    office: 'Lima Sociedade de Advogados',
    city: 'Brasília, DF',
    text: 'Migramos de planilhas para a Vouti em uma semana. Não voltamos mais.',
  },
];

interface TestimonialsSectionProps {
  statementAnim: {
    ref: React.RefObject<HTMLDivElement>;
    isVisible: boolean;
  };
}

const TestimonialsSection = ({ statementAnim }: TestimonialsSectionProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const getCardStyle = (offset: number) => {
    if (offset === 0) return 'opacity-100 translate-y-0 scale-100 z-30';
    if (offset === 1) return 'opacity-60 translate-y-20 scale-[0.97] z-20';
    if (offset === 2) return 'opacity-30 translate-y-40 scale-[0.94] z-10';
    return 'opacity-0 translate-y-56 scale-[0.91] z-0';
  };

  return (
    <section className="py-20 sm:py-28 border-t border-gray-200">
      <div className="container mx-auto px-6">
        <div
          ref={statementAnim.ref}
          className={`transition-all duration-700 ease-out ${statementAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: Title */}
            <div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
                Transforme<br />
                seu escritório.
              </h2>
              <p className="mt-6 text-gray-500 text-lg">
                Veja o que nossos clientes dizem.
              </p>
            </div>

            {/* Right: Carousel */}
            <div className="relative h-[320px] overflow-hidden">
              {testimonials.map((t, i) => {
                const offset = (i - activeIndex + testimonials.length) % testimonials.length;
                return (
                  <div
                    key={i}
                    className={`absolute inset-x-0 top-0 transition-all duration-700 ease-out ${getCardStyle(offset)}`}
                  >
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <span className="text-4xl leading-none text-gray-200 font-serif">"</span>
                      <p className="text-gray-700 text-sm leading-relaxed mt-1 mb-4">
                        {t.text}
                      </p>
                      <div className="border-t border-gray-100 pt-3">
                        <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.office} · {t.city}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
