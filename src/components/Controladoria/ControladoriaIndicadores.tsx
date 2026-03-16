import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { extrairTribunalDoNumeroProcesso } from "@/utils/processoHelpers";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";

interface TribunalCount {
  sigla: string;
  count: number;
  percentage: number;
}

export const ControladoriaIndicadores = () => {
  const { tenantId } = useTenantId();
  const [data, setData] = useState<TribunalCount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetch = async () => {
      setLoading(true);
      const { data: processos, error } = await supabase
        .from("processos_oab")
        .select("tribunal_sigla, numero_cnj")
        .eq("tenant_id", tenantId);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const map = new Map<string, number>();
      (processos || []).forEach((p) => {
        const sigla = p.tribunal_sigla || (p.numero_cnj ? extrairTribunalDoNumeroProcesso(p.numero_cnj) : "Desconhecido");
        map.set(sigla, (map.get(sigla) || 0) + 1);
      });

      const totalCount = processos?.length || 0;
      const sorted = Array.from(map.entries())
        .map(([sigla, count]) => ({
          sigla,
          count,
          percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      setData(sorted);
      setTotal(totalCount);
      setLoading(false);
    };

    fetch();
  }, [tenantId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2.5 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          Nenhum processo encontrado.
        </CardContent>
      </Card>
    );
  }

  const maxCount = data[0]?.count || 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Processos por Tribunal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item) => (
          <div key={item.sigla} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate">{item.sigla}</span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {item.count} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
            <Progress
              value={(item.count / maxCount) * 100}
              className="h-2"
            />
          </div>
        ))}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground pt-0">
        Total: {total} processos
      </CardFooter>
    </Card>
  );
};
