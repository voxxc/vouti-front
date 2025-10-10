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
  refreshKey?: number;
}

// Sequência de setores
const SETOR_SEQUENCE = [
  "Programação",
  "Corte a laser",
  "Dobra",
  "Montagem",
  "Acabamento",
  "Expedição",
  "Entrega"
];

export const SetorControls = ({ selectedOP, userSetor, onUpdate, refreshKey }: SetorControlsProps) => {
  const [isInProgress, setIsInProgress] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, [selectedOP?.id, userSetor, refreshKey]);

  // Recarregar status ao voltar o foco na janela
  useEffect(() => {
    const handleFocus = () => {
      checkStatus();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedOP?.id, userSetor, refreshKey]);

  const checkStatus = async () => {
    if (!userSetor) return;

    // Primeiro: verificar se existe algum registro ABERTO (saida IS NULL)
    const { data: openFlow } = await supabase
      .from("metal_setor_flow")
      .select("*")
      .eq("op_id", selectedOP.id)
      .eq("setor", userSetor)
      .is("saida", null)
      .maybeSingle();

    if (openFlow) {
      // Existe um fluxo aberto = está em progresso
      setIsInProgress(true);
      setIsPaused(false);
      return;
    }

    // Se não existe aberto, buscar o último registro para ver se está pausado
    const { data: lastFlow } = await supabase
      .from("metal_setor_flow")
      .select("*")
      .eq("op_id", selectedOP.id)
      .eq("setor", userSetor)
      .order("entrada", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastFlow && lastFlow.saida) {
      // Última sessão foi fechada = está pausado
      setIsInProgress(false);
      setIsPaused(true);
    } else {
      // Não tem nenhum registro = não iniciou ainda
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

    // VALIDAÇÃO SETOR CORTE: Verificar se especificações estão completas
    if (userSetor === "Corte a laser" && !isInProgress && !isPaused) {
      const hasAco = selectedOP.aco && selectedOP.aco.length > 0;
      const hasEspessura = selectedOP.espessura && selectedOP.espessura.length > 0;
      const hasQuantidade = selectedOP.quantidade_material && selectedOP.quantidade_material > 0;

      if (!hasAco || !hasEspessura || !hasQuantidade) {
        toast.error("É necessário preencher tipo de aço, espessura e quantidade antes de iniciar.");
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (!isInProgress && !isPaused) {
        // INICIAR (primeira vez) - mas primeiro verificar se já não existe fluxo aberto
        const { data: existingOpen } = await supabase
          .from("metal_setor_flow")
          .select("*")
          .eq("op_id", selectedOP.id)
          .eq("setor", userSetor)
          .is("saida", null)
          .maybeSingle();

        if (existingOpen) {
          // Já existe fluxo aberto, apenas sincronizar estado
          setIsInProgress(true);
          setIsPaused(false);
          toast.success("Produção já estava iniciada neste setor");
          await checkStatus();
          onUpdate();
          return;
        }

        // Não existe aberto, criar novo
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
        await checkStatus();

      } else if (isPaused) {
        // RETOMAR (já pausou antes, criar novo registro de entrada)
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
          acao: "retomou",
          detalhes: `Retomou produção no setor ${userSetor}`
        });

        setIsInProgress(true);
        setIsPaused(false);
        toast.success("Produção retomada");
        await checkStatus();

      } else if (isInProgress) {
        // PAUSAR (fechar o registro atual)
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
        await checkStatus();
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
    if (!userSetor) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Validação para setores que precisam de material specs
      if (userSetor === "Programação" || userSetor === "Corte a laser") {
        if (!selectedOP.aco || selectedOP.aco.length === 0 || 
            !selectedOP.espessura || selectedOP.espessura.length === 0) {
          toast.error("É necessário confirmar as especificações de material antes de enviar");
          setLoading(false);
          return;
        }
      }

      const isLast = isLastSetor();

      // Sempre fechar fluxo aberto do setor atual, se existir
      const { data: openFlow } = await supabase
        .from("metal_setor_flow")
        .select("*")
        .eq("op_id", selectedOP.id)
        .eq("setor", userSetor)
        .is("saida", null)
        .maybeSingle();

      if (openFlow) {
        await supabase
          .from("metal_setor_flow")
          .update({
            saida: new Date().toISOString(),
            operador_saida_id: user.id
          })
          .eq("id", openFlow.id);
      }

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

  // Lógica para mostrar controles:
  // - Programação: vê controles quando setor_atual é NULL ou "Programação"
  // - Outros setores: vê controles quando setor_atual corresponde ao seu setor
  const shouldShowControls = userSetor === "Programação" 
    ? (!selectedOP.setor_atual || selectedOP.setor_atual === "Programação")
    : (userSetor === selectedOP.setor_atual);

  if (!shouldShowControls) {
    return null;
  }

  // Programação não tem botão de iniciar/pausar, apenas enviar
  const isProgramacao = userSetor === "Programação";

  return (
    <div className="flex gap-2 mt-4">
      {!isProgramacao && (
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
      )}

      <Button
        onClick={handleAvancarOuConcluir}
        disabled={loading}
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
            Enviar
          </>
        )}
      </Button>
    </div>
  );
};