import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DANIEL_UUID = "8eda80fa-0319-4791-923e-551052282e62";

/**
 * Gate de visibilidade restrito ao usuário Daniel de Morais.
 * Usado para liberar features em fase experimental antes de expandir
 * para admins/controllers.
 */
export function useIsDaniel() {
  const [isDaniel, setIsDaniel] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setIsDaniel(data?.user?.id === DANIEL_UUID);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { isDaniel, loading };
}