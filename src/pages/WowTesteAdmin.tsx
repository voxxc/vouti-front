import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, Download, Trash2, RefreshCw } from "lucide-react";

type Resposta = {
  id: string;
  nome: string;
  indicado_por: string | null;
  respostas: Record<string, string>;
  user_agent: string | null;
  created_at: string;
};

const QUESTIONS: { id: string; title: string; options: Record<string, string> }[] = [
  { id: "q1", title: "Papel favorito", options: { A: "Dar muito dano", B: "Tankar e liderar", C: "Curar aliados", D: "Fazer de tudo" } },
  { id: "q2", title: "Prefere lutar", options: { A: "Corpo a corpo", B: "À distância", C: "Tanto faz" } },
  { id: "q3", title: "Dungeons/raids", options: { A: "Protagonista do dano", B: "Controlar inimigos", C: "Salvar o grupo", D: "Várias funções" } },
  { id: "q4", title: "PvP", options: { A: "Explodir rápido", B: "Difícil de matar", C: "Cura/controle", D: "Enganar/sobreviver" } },
  { id: "q5", title: "Complexidade", options: { A: "Fácil", B: "Média", C: "Difícil e recompensadora" } },
  { id: "q6", title: "Tema", options: { A: "Guerreiro épico", B: "Paladino sagrado", C: "Mago poderoso", D: "Assassino furtivo", E: "Invocador de demônios", F: "Arqueiro e pets", G: "Druida da natureza", H: "Xamã elemental", I: "Cavaleiro da Morte", J: "Sacerdote sombrio/sagrado" } },
  { id: "q7", title: "Pet permanente", options: { A: "Sim", B: "Não", C: "Tanto faz" } },
  { id: "q8", title: "Motivação de longo prazo", options: { A: "Dano gigante", B: "Ser indispensável", C: "Dominar classe complexa", D: "Trocar de função" } },
];

export default function WowTesteAdmin() {
  const { isSuperAdmin, session, loading: adminLoading } = useSuperAdmin();
  const [rows, setRows] = useState<Resposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("wow_quiz_respostas")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data as any) || []);
  };

  useEffect(() => {
    if (isSuperAdmin) load();
  }, [isSuperAdmin]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nome.toLowerCase().includes(q) ||
        (r.indicado_por || "").toLowerCase().includes(q),
    );
  }, [rows, busca]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportCsv = () => {
    const header = ["nome", "indicado_por", "created_at", ...QUESTIONS.map((q) => q.id)];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const cells = [
        JSON.stringify(r.nome),
        JSON.stringify(r.indicado_por || ""),
        JSON.stringify(r.created_at),
        ...QUESTIONS.map((q) => JSON.stringify(r.respostas?.[q.id] || "")),
      ];
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wow-quiz-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta resposta?")) return;
    const { error } = await supabase.from("wow_quiz_respostas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  if (adminLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Verificando acesso...</div>;
  }
  if (!session) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Wow Teste — Respostas</h1>
            <p className="text-sm text-muted-foreground">Quiz de escolha de classe (Cataclysm)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Atualizar</Button>
            <Button onClick={exportCsv}><Download className="h-4 w-4" /> Exportar CSV</Button>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <Input
            placeholder="Buscar por nome ou quem indicou..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="max-w-md"
          />
          <span className="text-sm text-muted-foreground">{filtered.length} de {rows.length}</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">Nenhuma resposta ainda.</Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const open = expanded.has(r.id);
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggle(r.id)} className="flex-1 flex items-center gap-3 text-left">
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <div className="flex-1">
                        <div className="font-medium">{r.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("pt-BR")}
                          {r.indicado_por && <> · indicado por <b>{r.indicado_por}</b></>}
                        </div>
                      </div>
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {open && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      {QUESTIONS.map((q) => {
                        const key = r.respostas?.[q.id];
                        const label = key ? q.options[key] || "?" : "—";
                        return (
                          <div key={q.id} className="flex gap-3 text-sm">
                            <span className="text-muted-foreground min-w-[180px]">{q.id.toUpperCase()} · {q.title}</span>
                            <span className="font-medium">{key ? `${key}) ${label}` : "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}