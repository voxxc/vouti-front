import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Gate de visibilidade para o recurso "Apartados".
 * Hoje retorna true apenas para o Daniel de Morais (super_admin).
 * Para liberar para mais usuários, editar a função SQL `can_use_apartados`.
 */
export function useCanUseApartados() {
  const [canUse, setCanUse] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        if (!cancelled) {
          setCanUse(false);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase.rpc("can_use_apartados", {
        _user_id: userId,
      });
      if (cancelled) return;
      if (error) {
        console.error("[useCanUseApartados] erro:", error);
        setCanUse(false);
      } else {
        setCanUse(!!data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { canUse, loading };
}