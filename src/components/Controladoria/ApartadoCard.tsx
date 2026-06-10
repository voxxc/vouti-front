import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderInput className="h-4 w-4 text-primary" />
          Apartado
        </CardTitle>
        <CardDescription>
          Sinalize que este processo é um apartado. Aparecerá no filtro "Apartados" da Central de Andamentos Não Lidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="apartado-switch" className="cursor-pointer">
            Marcar como apartado
          </Label>
          <Switch
            id="apartado-switch"
            checked={state.apartado}
            disabled={saving}
            onCheckedChange={toggle}
          />
        </div>
        {state.apartado && state.apartado_em && (
          <Badge variant="secondary" className="font-normal">
            Apartado desde {format(new Date(state.apartado_em), "dd/MM/yyyy", { locale: ptBR })}
            {state.apartado_por_nome ? ` por ${state.apartado_por_nome}` : ""}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}