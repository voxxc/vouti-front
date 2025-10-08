import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, User, Calendar, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { MetalOP, MetalSetorFlow } from "@/types/metal";
import { format } from "date-fns";

interface MetalOPDetailsSheetProps {
  op: MetalOP | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MetalOPDetailsSheet({ op, open, onOpenChange }: MetalOPDetailsSheetProps) {
  const [setorFlows, setSetorFlows] = useState<MetalSetorFlow[]>([]);

  useEffect(() => {
    if (op?.id) {
      loadSetorFlows();
    }
  }, [op?.id]);

  const loadSetorFlows = async () => {
    if (!op?.id) return;

    const { data } = await supabase
      .from("metal_setor_flow")
      .select("*")
      .eq("op_id", op.id)
      .order("entrada", { ascending: true });

    if (data) {
      setSetorFlows(data);
    }
  };

  const SETORES = [
    'Programação',
    'Guilhotina',
    'Corte a laser',
    'Dobra',
    'Montagem',
    'Acabamento',
    'Expedição',
    'Entrega'
  ];

  const getSetorStatus = (setor: string) => {
    const flow = setorFlows.find(f => f.setor === setor);
    if (!flow) return 'pending';
    if (flow.saida) return 'completed';
    return 'in-progress';
  };

  if (!op) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-center text-xl">Detalhes da OP</SheetTitle>
          <p className="text-center text-muted-foreground font-medium">OP {op.numero_op}</p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={op.status === 'concluido' ? 'default' : 'secondary'}>
                  {op.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span>{op.produto}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{op.cliente}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(op.data_entrada), 'dd/MM/yyyy')}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span>Qtd: {op.quantidade}</span>
              </div>
            </CardContent>
          </Card>

          {/* Progresso nos Setores */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <h3 className="font-semibold">Progresso nos Setores</h3>
            </div>

            <div className="space-y-2">
              {SETORES.map((setor, index) => {
                const status = getSetorStatus(setor);
                const flow = setorFlows.find(f => f.setor === setor);

                return (
                  <div
                    key={setor}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="relative">
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          status === 'completed'
                            ? 'bg-primary border-primary text-primary-foreground'
                            : status === 'in-progress'
                            ? 'bg-yellow-500/20 border-yellow-500 text-yellow-600'
                            : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                        }`}
                      >
                        {status === 'completed' ? (
                          <span className="text-xs font-bold">✓</span>
                        ) : (
                          <span className="text-xs">{index + 1}</span>
                        )}
                      </div>
                      {index < SETORES.length - 1 && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-border" />
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-sm">{setor}</p>
                      {flow && (
                        <p className="text-xs text-muted-foreground">
                          {flow.entrada && `Entrada: ${format(new Date(flow.entrada), 'dd/MM HH:mm')}`}
                          {flow.saida && ` - Saída: ${format(new Date(flow.saida), 'dd/MM HH:mm')}`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
