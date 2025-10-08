import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { MetalOP } from "@/types/metal";

interface ProgramacaoControlsProps {
  selectedOP: MetalOP;
  userSetor: string | null;
  onUpdate: () => void;
}

export function ProgramacaoControls({ selectedOP, userSetor, onUpdate }: ProgramacaoControlsProps) {
  const { toast } = useToast();
  const [isInProgress, setIsInProgress] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, [selectedOP]);

  const checkStatus = async () => {
    // Verificar se tem fluxo aberto (sem saída)
    const { data: openFlow } = await supabase
      .from("metal_setor_flow")
      .select("*")
      .eq("op_id", selectedOP.id)
      .eq("setor", "Programação")
      .is("saida", null)
      .maybeSingle();

    setIsInProgress(!!openFlow);

    // Verificar se foi pausado (último fluxo tem saída mas OP ainda em Programação)
    if (!openFlow) {
      const { data: lastFlow } = await supabase
        .from("metal_setor_flow")
        .select("*")
        .eq("op_id", selectedOP.id)
        .eq("setor", "Programação")
        .not("saida", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Está pausado se existe fluxo fechado E a OP ainda está em Programação
      setIsPaused(!!lastFlow && selectedOP.setor_atual === "Programação");
    } else {
      setIsPaused(false);
    }
  };

  const handleIniciarPausar = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (isInProgress) {
        // Pausar - registrar saída do setor
        const { data: openFlow } = await supabase
          .from("metal_setor_flow")
          .select("*")
          .eq("op_id", selectedOP.id)
          .eq("setor", "Programação")
          .is("saida", null)
          .maybeSingle();

        if (openFlow) {
          const { error: updateError } = await supabase
            .from("metal_setor_flow")
            .update({
              saida: new Date().toISOString(),
              operador_saida_id: user.id
            })
            .eq("id", openFlow.id);

          if (updateError) throw updateError;

          // Atualizar OP para aguardando
          const { error: opError } = await supabase
            .from("metal_ops")
            .update({
              status: "aguardando",
              setor_atual: null
            })
            .eq("id", selectedOP.id);

          if (opError) throw opError;

          // Registrar histórico
          await supabase.from("metal_op_history").insert({
            op_id: selectedOP.id,
            user_id: user.id,
            acao: "pausado",
            detalhes: "OP pausada no setor Programação"
          });

          toast({ title: "OP pausada" });
          setIsInProgress(false);
          setIsPaused(true);
        }
      } else {
        // Iniciar - registrar entrada no setor
        const { error: flowError } = await supabase
          .from("metal_setor_flow")
          .insert({
            op_id: selectedOP.id,
            setor: "Programação",
            entrada: new Date().toISOString(),
            operador_entrada_id: user.id
          });

        if (flowError) throw flowError;

        // Atualizar OP para em produção
        const { error: opError } = await supabase
          .from("metal_ops")
          .update({
            status: "em_producao",
            setor_atual: "Programação"
          })
          .eq("id", selectedOP.id);

        if (opError) throw opError;

        // Registrar histórico
        await supabase.from("metal_op_history").insert({
          op_id: selectedOP.id,
          user_id: user.id,
          acao: "iniciado",
          detalhes: "OP iniciada no setor Programação"
        });

        toast({ title: "OP iniciada" });
        setIsInProgress(true);
        setIsPaused(false);
      }

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvancar = async () => {
    if (!isPaused) {
      toast({
        title: "Atenção",
        description: "Você precisa pausar a OP antes de avançar",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Registrar saída da Programação
      const { data: openFlow } = await supabase
        .from("metal_setor_flow")
        .select("*")
        .eq("op_id", selectedOP.id)
        .eq("setor", "Programação")
        .is("saida", null)
        .maybeSingle();

      if (openFlow) {
        const { error: updateError } = await supabase
          .from("metal_setor_flow")
          .update({
            saida: new Date().toISOString(),
            operador_saida_id: user.id
          })
          .eq("id", openFlow.id);

        if (updateError) throw updateError;
      }

      // Avançar para Guilhotina (próximo setor)
      const proximoSetor = "Guilhotina";
      
      const { error: flowError } = await supabase
        .from("metal_setor_flow")
        .insert({
          op_id: selectedOP.id,
          setor: proximoSetor,
          entrada: new Date().toISOString(),
          operador_entrada_id: user.id
        });

      if (flowError) throw flowError;

      // Atualizar OP
      const { error: opError } = await supabase
        .from("metal_ops")
        .update({
          setor_atual: proximoSetor,
          status: "em_producao"
        })
        .eq("id", selectedOP.id);

      if (opError) throw opError;

      // Registrar histórico
      await supabase.from("metal_op_history").insert({
        op_id: selectedOP.id,
        user_id: user.id,
        acao: "avancado",
        detalhes: `OP avançada de Programação para ${proximoSetor}`
      });

      toast({ 
        title: "OP avançada",
        description: `OP movida para ${proximoSetor}`
      });
      
      setIsInProgress(false);
      setIsPaused(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao avançar OP",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Apenas mostrar os controles se o usuário for do setor Programação
  if (userSetor !== "Programação") {
    return null;
  }

  return (
    <div className="flex gap-2 w-full">
      <Button
        variant={isInProgress ? "destructive" : "default"}
        onClick={handleIniciarPausar}
        disabled={loading}
        className="flex-1 h-12"
      >
        {isInProgress ? (
          <>
            <Pause className="h-4 w-4 mr-2" />
            Pausar
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Iniciar
          </>
        )}
      </Button>

      <Button
        variant="outline"
        onClick={handleAvancar}
        disabled={loading || !isPaused}
        className="flex-1 h-12"
      >
        <ArrowRight className="h-4 w-4 mr-2" />
        Avançar
      </Button>
    </div>
  );
}
