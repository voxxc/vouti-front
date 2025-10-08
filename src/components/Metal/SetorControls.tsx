import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, ArrowRight, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MetalOP } from "@/types/metal";
import { toast } from "sonner";

interface SetorControlsProps {
  selectedOP: MetalOP;
  userSetor: string | null;
  onUpdate: () => void;
}

// Sequência de setores
const SETOR_SEQUENCE = [
  "Programação",
  "Guilhotina",
  "Corte a Laser",
  "Dobra",
  "Montagem",
  "Acabamento",
  "Expedição",
  "Entrega"
];

export const SetorControls = ({ selectedOP, userSetor, onUpdate }: SetorControlsProps) => {
  const [isInProgress, setIsInProgress] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, [selectedOP]);

  const checkStatus = async () => {
    if (!userSetor) return;

    const { data } = await supabase
      .from("metal_setor_flow")
      .select("*")
      .eq("op_id", selectedOP.id)
      .eq("setor", userSetor)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setIsInProgress(!!data.entrada && !data.saida);
      setIsPaused(!!data.saida);
    } else {
      setIsInProgress(false);
      setIsPaused(false);
    }
  };

  const getNextSetor = (): string | null => {
    if (!userSetor) return null;
    const currentIndex = SETOR_SEQUENCE.indexOf(userSetor);
    if (currentIndex === -1 || currentIndex === SETOR_SEQUENCE.length - 1) {
      return null;
    }
    return SETOR_SEQUENCE[currentIndex + 1];
  };

  const isLastSetor = (): boolean => {
    return userSetor === "Entrega";
  };

  const handleIniciarPausar = async () => {
    if (!userSetor) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (!isInProgress && !isPaused) {
        // INICIAR
        const { error: flowError } = await supabase.from("metal_setor_flow").insert({
          op_id: selectedOP.id,
          setor: userSetor,
          entrada: new Date().toISOString(),
          operador_entrada_id: user.id
        });

        if (flowError) throw flowError;

        const { error: opError } = await supabase
          .from("metal_ops")
          .update({
            status: "em_producao",
            setor_atual: userSetor
          })
          .eq("id", selectedOP.id);

        if (opError) {
          console.error("Erro ao atualizar OP:", opError);
          throw new Error(`Erro ao atualizar OP: ${opError.message}`);
        }

        await supabase.from("metal_op_history").insert({
          op_id: selectedOP.id,
          user_id: user.id,
          acao: "iniciou",
          detalhes: `Iniciou produção no setor ${userSetor}`
        });

        setIsInProgress(true);
        setIsPaused(false);
        toast.success("Produção iniciada");

      } else if (isInProgress) {
        // PAUSAR
        const { data: currentFlow } = await supabase
          .from("metal_setor_flow")
          .select("*")
          .eq("op_id", selectedOP.id)
          .eq("setor", userSetor)
          .is("saida", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!currentFlow) throw new Error("Fluxo não encontrado");

        const { error: flowError } = await supabase
          .from("metal_setor_flow")
          .update({
            saida: new Date().toISOString(),
            operador_saida_id: user.id
          })
          .eq("id", currentFlow.id);

        if (flowError) throw flowError;

        const { error: opError } = await supabase
          .from("metal_ops")
          .update({ status: "pausado" })
          .eq("id", selectedOP.id);

        if (opError) {
          console.error("Erro ao atualizar OP:", opError);
          throw new Error(`Erro ao atualizar OP: ${opError.message}`);
        }

        await supabase.from("metal_op_history").insert({
          op_id: selectedOP.id,
          user_id: user.id,
          acao: "pausou",
          detalhes: `Pausou produção no setor ${userSetor}`
        });

        setIsInProgress(false);
        setIsPaused(true);
        toast.success("Produção pausada");
      }

      onUpdate();
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error(error.message || "Erro ao processar ação");
    } finally {
      setLoading(false);
    }
  };

  const handleAvancarOuConcluir = async () => {
    if (!userSetor || !isPaused) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const isLast = isLastSetor();

      if (isLast) {
        // CONCLUIR (setor Entrega)
        const { error: opError } = await supabase
          .from("metal_ops")
          .update({
            status: "concluido"
          })
          .eq("id", selectedOP.id);

        if (opError) {
          console.error("Erro ao concluir OP:", opError);
          throw new Error(`Erro ao concluir OP: ${opError.message}`);
        }

        await supabase.from("metal_op_history").insert({
          op_id: selectedOP.id,
          user_id: user.id,
          acao: "concluiu",
          detalhes: `OP concluída no setor ${userSetor}`
        });

        toast.success("OP concluída com sucesso!");
      } else {
        // AVANÇAR (outros setores)
        const proximoSetor = getNextSetor();
        if (!proximoSetor) throw new Error("Próximo setor não encontrado");

        const { error: opError } = await supabase
          .from("metal_ops")
          .update({
            setor_atual: proximoSetor,
            status: "aguardando"
          })
          .eq("id", selectedOP.id);

        if (opError) {
          console.error("Erro ao atualizar OP:", opError);
          throw new Error(`Erro ao atualizar OP: ${opError.message}`);
        }

        await supabase.from("metal_op_history").insert({
          op_id: selectedOP.id,
          user_id: user.id,
          acao: "avançou",
          detalhes: `Avançou do setor ${userSetor} para ${proximoSetor}`
        });

        toast.success(`OP avançada para ${proximoSetor}`);
      }

      setIsInProgress(false);
      setIsPaused(false);
      onUpdate();
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error(error.message || "Erro ao processar ação");
    } finally {
      setLoading(false);
    }
  };

  // Só mostra os controles se o setor do usuário corresponde ao setor atual da OP
  if (userSetor !== selectedOP.setor_atual) {
    return null;
  }

  return (
    <div className="flex gap-2 mt-4">
      <Button
        onClick={handleIniciarPausar}
        disabled={loading || isPaused}
        variant={isInProgress ? "outline" : "default"}
        className="flex-1"
      >
        {isInProgress ? (
          <>
            <Pause className="mr-2 h-4 w-4" />
            Pausar
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            {isPaused ? "Retomar" : "Iniciar"}
          </>
        )}
      </Button>

      <Button
        onClick={handleAvancarOuConcluir}
        disabled={loading || !isPaused}
        variant="default"
        className="flex-1"
      >
        {isLastSetor() ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Concluir
          </>
        ) : (
          <>
            <ArrowRight className="mr-2 h-4 w-4" />
            Avançar
          </>
        )}
      </Button>
    </div>
  );
};