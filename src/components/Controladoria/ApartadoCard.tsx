import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FolderInput } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ApartadoCardProps {
  processoOabId: string;
}

interface ApartadoState {
  apartado: boolean;
  apartado_em: string | null;
  apartado_por: string | null;
  apartado_por_nome?: string | null;
}

export default function ApartadoCard({ processoOabId }: ApartadoCardProps) {
  const [state, setState] = useState<ApartadoState>({
    apartado: false,
    apartado_em: null,
    apartado_por: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("processos_oab")
        .select("apartado, apartado_em, apartado_por")
        .eq("id", processoOabId)
        .maybeSingle();
      if (cancelled || error || !data) return;

      let nome: string | null = null;
      if (data.apartado_por) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", data.apartado_por)
          .maybeSingle();
        nome = prof?.full_name ?? null;
      }
      if (!cancelled) {
        setState({
          apartado: !!data.apartado,
          apartado_em: data.apartado_em,
          apartado_por: data.apartado_por,
          apartado_por_nome: nome,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [processoOabId]);

  const toggle = async (next: boolean) => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      const payload = next
        ? { apartado: true, apartado_em: new Date().toISOString(), apartado_por: userId }
        : { apartado: false, apartado_em: null, apartado_por: null };

      const { error } = await supabase
        .from("processos_oab")
        .update(payload)
        .eq("id", processoOabId);

      if (error) {
        toast.error("Erro ao atualizar apartado");
        return;
      }

      setState((prev) => ({
        ...prev,
        apartado: next,
        apartado_em: payload.apartado_em,
        apartado_por: payload.apartado_por,
      }));
      toast.success(next ? "Processo marcado como apartado" : "Marcação de apartado removida");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-1 py-1 text-xs text-muted-foreground">
          <Checkbox
            id={`apartado-${processoOabId}`}
            checked={state.apartado}
            disabled={saving}
            onCheckedChange={(v) => toggle(v === true)}
            className="h-3.5 w-3.5"
          />
          <label
            htmlFor={`apartado-${processoOabId}`}
            className="cursor-pointer flex items-center gap-1.5 select-none"
          >
            <FolderInput className="h-3 w-3" />
            Marcar como apartado
          </label>
          {state.apartado && state.apartado_em && (
            <span className="text-[11px] opacity-80">
              · desde {format(new Date(state.apartado_em), "dd/MM/yyyy", { locale: ptBR })}
              {state.apartado_por_nome ? ` por ${state.apartado_por_nome}` : ""}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-xs">
        Aparece no filtro "Apartados" da Central de Andamentos Não Lidos e da aba Geral.
      </TooltipContent>
    </Tooltip>
  );
}