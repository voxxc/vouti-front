import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Option = { key: string; label: string };
type Question = { id: string; title: string; options: Option[] };

const QUESTIONS: Question[] = [
  {
    id: "q1",
    title: "1. Qual papel você MAIS gosta em jogos?",
    options: [
      { key: "A", label: "Dar muito dano" },
      { key: "B", label: "Tankar e liderar o grupo" },
      { key: "C", label: "Curar os aliados" },
      { key: "D", label: "Fazer de tudo um pouco" },
    ],
  },
  {
    id: "q2",
    title: "2. Você prefere lutar:",
    options: [
      { key: "A", label: "Corpo a corpo" },
      { key: "B", label: "À distância" },
      { key: "C", label: "Tanto faz" },
    ],
  },
  {
    id: "q3",
    title: "3. Em dungeons e raids, você quer:",
    options: [
      { key: "A", label: "Ser o protagonista do dano" },
      { key: "B", label: "Controlar os inimigos" },
      { key: "C", label: "Salvar o grupo" },
      { key: "D", label: "Ter várias opções de função" },
    ],
  },
  {
    id: "q4",
    title: "4. No PvP você gosta de:",
    options: [
      { key: "A", label: "Explodir o inimigo rapidamente" },
      { key: "B", label: "Ser difícil de matar" },
      { key: "C", label: "Ajudar o time com cura/controle" },
      { key: "D", label: "Enganar, controlar e sobreviver" },
    ],
  },
  {
    id: "q5",
    title: "5. Você prefere uma classe:",
    options: [
      { key: "A", label: "Fácil de aprender" },
      { key: "B", label: "Média" },
      { key: "C", label: "Difícil, mas recompensadora" },
    ],
  },
  {
    id: "q6",
    title: "6. O tema que mais te atrai:",
    options: [
      { key: "A", label: "Guerreiro épico" },
      { key: "B", label: "Paladino sagrado" },
      { key: "C", label: "Mago poderoso" },
      { key: "D", label: "Assassino furtivo" },
      { key: "E", label: "Invocador de demônios" },
      { key: "F", label: "Arqueiro e pets" },
      { key: "G", label: "Druida da natureza" },
      { key: "H", label: "Xamã elemental" },
      { key: "I", label: "Cavaleiro da Morte" },
      { key: "J", label: "Sacerdote sombrio/sagrado" },
    ],
  },
  {
    id: "q7",
    title: "7. Você gosta de ter PET permanente?",
    options: [
      { key: "A", label: "Sim" },
      { key: "B", label: "Não" },
      { key: "C", label: "Tanto faz" },
    ],
  },
  {
    id: "q8",
    title: "8. O que mais te faria continuar jogando por meses?",
    options: [
      { key: "A", label: "Ver números gigantes de dano" },
      { key: "B", label: "Ser indispensável em grupos" },
      { key: "C", label: "Dominar uma classe complexa" },
      { key: "D", label: "Poder mudar de função quando quiser" },
    ],
  },
];

export default function WowTeste() {
  const [nome, setNome] = useState("");
  const [indicadoPor, setIndicadoPor] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Injeta fontes WoW-like uma única vez
    const id = "wow-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=UnifrakturCook:wght@700&family=Cormorant+Garamond:ital,wght@0,500;1,500&display=swap";
      document.head.appendChild(link);
    }
    document.title = "Escolha de Classe — Cataclysm";
  }, []);

  const total = QUESTIONS.length;
  const answeredCount = useMemo(
    () => QUESTIONS.filter((q) => answers[q.id]).length,
    [answers],
  );
  const progress = Math.round((answeredCount / total) * 100);

  const handleSelect = (qid: string, key: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: key }));
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast({ title: "Diga seu nome, aventureiro", variant: "destructive" });
      return;
    }
    if (answeredCount < total) {
      toast({
        title: "Responda todas as perguntas",
        description: `Faltam ${total - answeredCount} pergunta(s).`,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("wow_quiz_respostas").insert({
      nome: nome.trim(),
      indicado_por: indicadoPor.trim() || null,
      respostas: answers,
      user_agent: navigator.userAgent,
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "Falha ao enviar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const share = async () => {
    const url = `${window.location.origin}/wowteste`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado!", description: "Envie ao seu amigo." });
    } catch {
      toast({ title: url });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'Cormorant Garamond', 'Cinzel', serif",
        color: "#e8d9a8",
        background:
          "radial-gradient(1200px 800px at 50% -100px, #3a1a05 0%, #1a0a03 55%, #08040a 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Overlay textura */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.05 0 0 0 0 0.03 0 0 0 0 0.02 0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          opacity: 0.35,
          mixBlendMode: "overlay",
        }}
      />

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "48px 20px 96px", position: "relative" }}>
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontFamily: "'UnifrakturCook', serif",
              fontSize: 14,
              letterSpacing: 6,
              color: "#c9a34a",
              textTransform: "uppercase",
            }}
          >
            World of Warcraft
          </div>
          <h1
            style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: "clamp(30px, 5vw, 52px)",
              letterSpacing: 2,
              margin: "6px 0 8px",
              background: "linear-gradient(180deg, #f5d67a 0%, #c9a34a 55%, #7a5a1a 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 2px 20px rgba(201,163,74,0.35)",
            }}
          >
            Pesquisa de Perfil
          </h1>
          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "clamp(14px, 2vw, 18px)",
              letterSpacing: 4,
              color: "#b8935a",
            }}
          >
            ESCOLHA DE CLASSE — CATACLYSM
          </div>
          <OrnamentDivider />
        </header>

        {done ? (
          <ScrollPanel>
            <div style={{ textAlign: "center", padding: "24px 12px" }}>
              <div style={{ fontSize: 64, lineHeight: 1 }}>⚜</div>
              <h2
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 34,
                  margin: "16px 0 12px",
                  color: "#f5d67a",
                  letterSpacing: 2,
                }}
              >
                Seu Veredito está sendo forjado
              </h2>
              <p style={{ fontSize: 19, maxWidth: 560, margin: "0 auto", color: "#d9c9a3" }}>
                Os Anciãos analisam suas respostas nas profundezas de Azeroth.
                Em breve, {nome.split(" ")[0] || "aventureiro"}, você receberá a
                classe que o destino reservou.
              </p>
              <button onClick={share} style={buttonStyle} className="wow-btn" type="button">
                Enviar para um amigo
              </button>
            </div>
          </ScrollPanel>
        ) : (
          <>
            {/* Envio ao amigo */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <button onClick={share} style={{ ...buttonStyle, padding: "10px 22px", fontSize: 14 }} type="button">
                📜 Envie ao seu amigo
              </button>
            </div>

            {/* Identificação */}
            <ScrollPanel>
              <FieldLabel>Seu nome de aventureiro</FieldLabel>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Arthas, Jaina..."
                style={inputStyle}
              />
              <div style={{ height: 14 }} />
              <FieldLabel>Quem te enviou este pergaminho? (opcional)</FieldLabel>
              <input
                value={indicadoPor}
                onChange={(e) => setIndicadoPor(e.target.value)}
                placeholder="Nome do amigo"
                style={inputStyle}
              />
            </ScrollPanel>

            {/* Progresso */}
            <div style={{ margin: "20px 4px 8px", display: "flex", justifyContent: "space-between", fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: 2, color: "#b8935a" }}>
              <span>PROGRESSO</span>
              <span>{answeredCount}/{total}</span>
            </div>
            <div style={{ height: 8, background: "#1a0d05", border: "1px solid #4a3418", borderRadius: 4, overflow: "hidden", marginBottom: 28 }}>
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #7a5a1a, #f5d67a, #c9a34a)",
                  boxShadow: "0 0 12px rgba(245,214,122,0.6)",
                  transition: "width .3s ease",
                }}
              />
            </div>

            {/* Perguntas */}
            {QUESTIONS.map((q) => (
              <ScrollPanel key={q.id}>
                <h3
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 20,
                    color: "#f5d67a",
                    margin: "0 0 16px",
                    letterSpacing: 1,
                  }}
                >
                  {q.title}
                </h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelect(q.id, opt.key)}
                        style={{
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "12px 16px",
                          borderRadius: 6,
                          cursor: "pointer",
                          border: selected ? "1px solid #f5d67a" : "1px solid #4a3418",
                          background: selected
                            ? "linear-gradient(180deg, rgba(245,214,122,0.18), rgba(122,90,26,0.15))"
                            : "rgba(20,10,4,0.55)",
                          color: selected ? "#fff4c8" : "#e8d9a8",
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: 18,
                          transition: "all .15s ease",
                          boxShadow: selected ? "0 0 18px rgba(245,214,122,0.35), inset 0 0 20px rgba(245,214,122,0.08)" : "none",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            border: "1px solid #c9a34a",
                            background: selected ? "#c9a34a" : "transparent",
                            color: selected ? "#1a0d05" : "#c9a34a",
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 700,
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        >
                          {opt.key}
                        </span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </ScrollPanel>
            ))}

            {/* Envio */}
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ ...buttonStyle, opacity: submitting ? 0.6 : 1, padding: "16px 40px", fontSize: 18 }}
                type="button"
              >
                {submitting ? "Consultando..." : "⚔ Consultar o Oráculo"}
              </button>
              <div style={{ marginTop: 12, fontSize: 13, color: "#8a7451" }}>
                {answeredCount}/{total} respondidas
              </div>
            </div>
          </>
        )}

        <footer style={{ marginTop: 48, textAlign: "center", fontSize: 12, color: "#6b5638", letterSpacing: 1 }}>
          FOR THE HORDE · FOR THE ALLIANCE
        </footer>
      </div>
    </div>
  );
}

/* --- pieces --- */

function ScrollPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        margin: "0 0 18px",
        padding: "22px 24px",
        borderRadius: 10,
        border: "1px solid #4a3418",
        background:
          "linear-gradient(180deg, rgba(40,22,8,0.85), rgba(20,10,4,0.9))",
        boxShadow:
          "0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(245,214,122,0.12), inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <span aria-hidden style={cornerStyle("tl")} />
      <span aria-hidden style={cornerStyle("tr")} />
      <span aria-hidden style={cornerStyle("bl")} />
      <span aria-hidden style={cornerStyle("br")} />
      {children}
    </div>
  );
}

function OrnamentDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "20px auto 0", color: "#c9a34a" }}>
      <span style={{ height: 1, width: 80, background: "linear-gradient(90deg, transparent, #c9a34a)" }} />
      <span style={{ fontSize: 20 }}>❦</span>
      <span style={{ height: 1, width: 80, background: "linear-gradient(90deg, #c9a34a, transparent)" }} />
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: 2, color: "#c9a34a", marginBottom: 8, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 6,
  border: "1px solid #4a3418",
  background: "rgba(10,5,2,0.7)",
  color: "#f5e8c2",
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 18,
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontWeight: 700,
  letterSpacing: 3,
  textTransform: "uppercase",
  padding: "14px 32px",
  fontSize: 15,
  color: "#1a0d05",
  background:
    "linear-gradient(180deg, #f5d67a 0%, #c9a34a 50%, #7a5a1a 100%)",
  border: "1px solid #7a5a1a",
  borderRadius: 6,
  cursor: "pointer",
  boxShadow:
    "0 8px 24px rgba(0,0,0,0.5), 0 0 22px rgba(245,214,122,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
};

function cornerStyle(pos: "tl" | "tr" | "bl" | "br"): React.CSSProperties {
  const size = 14;
  const off = -1;
  const base: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    borderColor: "#c9a34a",
    borderStyle: "solid",
    borderWidth: 0,
  };
  if (pos === "tl") return { ...base, top: off, left: off, borderTopWidth: 2, borderLeftWidth: 2 };
  if (pos === "tr") return { ...base, top: off, right: off, borderTopWidth: 2, borderRightWidth: 2 };
  if (pos === "bl") return { ...base, bottom: off, left: off, borderBottomWidth: 2, borderLeftWidth: 2 };
  return { ...base, bottom: off, right: off, borderBottomWidth: 2, borderRightWidth: 2 };
}