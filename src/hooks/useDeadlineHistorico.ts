import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DeadlineHistoricoItem {
  id: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  alterado_em: string;
  alterado_por: string | null;
  autor_nome?: string | null;
  autor_avatar?: string | null;
}

export function useDeadlineHistorico(deadlineId: string | null | undefined) {
  const [items, setItems] = useState<DeadlineHistoricoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistorico = async () => {
    if (!deadlineId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deadline_historico")
        .select("id, campo_alterado, valor_anterior, valor_novo, alterado_em, alterado_por")
        .eq("deadline_id", deadlineId)
        .order("alterado_em", { ascending: false });

      if (error) throw error;

      const userIds = Array.from(
        new Set((data || []).map((d: any) => d.alterado_por).filter(Boolean) as string[])
      );

      const profileMap = new Map<string, { full_name?: string; avatar_url?: string; email?: string }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, email")
          .in("user_id", userIds);
        (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));
      }

      setItems(
        (data || []).map((d: any) => {
          const p = d.alterado_por ? profileMap.get(d.alterado_por) : undefined;
          return {
            id: d.id,
            campo_alterado: d.campo_alterado,
            valor_anterior: d.valor_anterior,
            valor_novo: d.valor_novo,
            alterado_em: d.alterado_em,
            alterado_por: d.alterado_por,
            autor_nome: p?.full_name || p?.email || null,
            autor_avatar: p?.avatar_url || null,
          };
        })
      );
    } catch (err) {
      console.error("[useDeadlineHistorico]", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineId]);

  return { items, loading, refetch: fetchHistorico };
}