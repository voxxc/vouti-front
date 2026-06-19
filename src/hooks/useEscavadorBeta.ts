import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

let cached: boolean | null = null;
let cachedFor: string | null = null;

export function useEscavadorBeta() {
  const [enabled, setEnabled] = useState<boolean>(cached ?? false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        if (!cancelled) setEnabled(false);
        return;
      }
      if (cached !== null && cachedFor === uid) {
        if (!cancelled) setEnabled(cached);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('escavador_beta')
        .eq('id', uid)
        .maybeSingle();
      const value = !!(data as any)?.escavador_beta;
      cached = value;
      cachedFor = uid;
      if (!cancelled) setEnabled(value);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}