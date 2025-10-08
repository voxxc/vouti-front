import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Package, 
  User, 
  Clock, 
  CheckCircle2,
  Circle,
  AlertCircle 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { MetalOP, MetalSetorFlow, MetalOPHistory } from "@/types/metal";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MetalOPInfoProps {
  selectedOP: MetalOP | null;
}

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

export function MetalOPInfo({ selectedOP }: MetalOPInfoProps) {
  const [flows, setFlows] = useState<MetalSetorFlow[]>([]);
  const [history, setHistory] = useState<MetalOPHistory[]>([]);

  useEffect(() => {
    if (!selectedOP) return;

    loadFlows();
    loadHistory();

    const flowChannel = supabase
      .channel('metal-setor-flow-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'metal_setor_flow', filter: `op_id=eq.${selectedOP.id}` },
        () => loadFlows()
      )
      .subscribe();

    const historyChannel = supabase
      .channel('metal-op-history-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'metal_op_history', filter: `op_id=eq.${selectedOP.id}` },
        () => loadHistory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(flowChannel);
      supabase.removeChannel(historyChannel);
    };
  }, [selectedOP]);

  const loadFlows = async () => {
    if (!selectedOP) return;

    const { data } = await supabase
      .from('metal_setor_flow')
      .select('*')
      .eq('op_id', selectedOP.id)
      .order('created_at', { ascending: true });

    if (data) setFlows(data);
  };

  const loadHistory = async () => {
    if (!selectedOP) return;

    const { data } = await supabase
      .from('metal_op_history')
      .select('*')
      .eq('op_id', selectedOP.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setHistory(data);
  };

  if (!selectedOP) {
    return (
      <div className="h-full flex items-center justify-center bg-background border-l">
        <div className="text-center text-muted-foreground p-8">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Selecione uma OP para ver os detalhes</p>
        </div>
      </div>
    );
  }

  const getSetorStatus = (setor: string) => {
    const flow = flows.find(f => f.setor === setor);
    if (!flow) return 'pending';
    if (flow.saida) return 'completed';
    if (flow.entrada) return 'in-progress';
    return 'pending';
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-1">Detalhes da OP</h2>
        <p className="text-sm text-muted-foreground">OP {selectedOP.numero_op}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Resumo */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="outline">
                {selectedOP.status.replace('_', ' ')}
              </Badge>
            </div>
            
            <Separator />
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedOP.produto}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{selectedOP.cliente}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(selectedOP.data_entrada).toLocaleDateString('pt-BR')}</span>
              </div>
              
              {selectedOP.quantidade && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>Qtd: {selectedOP.quantidade}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Timeline dos Setores */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Progresso nos Setores
            </h3>
            <div className="space-y-2">
              {SETORES.map((setor, index) => {
                const status = getSetorStatus(setor);
                const flow = flows.find(f => f.setor === setor);
                
                return (
                  <div key={setor} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      {status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : status === 'in-progress' ? (
                        <AlertCircle className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/30" />
                      )}
                      {index < SETORES.length - 1 && (
                        <div className={`w-px h-8 ${status === 'completed' ? 'bg-green-500/30' : 'bg-border'}`} />
                      )}
                    </div>
                    
                    <div className="flex-1 pb-2">
                      <div className="font-medium text-sm">{setor}</div>
                      {flow && (
                        <div className="text-xs text-muted-foreground space-y-1 mt-1">
                          {flow.entrada && (
                            <div>
                              Entrada: {new Date(flow.entrada).toLocaleString('pt-BR')}
                            </div>
                          )}
                          {flow.saida && (
                            <div>
                              Saída: {new Date(flow.saida).toLocaleString('pt-BR')}
                            </div>
                          )}
                          {flow.entrada && !flow.saida && (
                            <Badge variant="secondary" className="text-xs">
                              Em andamento
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Histórico */}
          {history.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Histórico Recente</h3>
              <div className="space-y-2">
                {history.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="text-sm font-medium">{item.acao}</div>
                    {item.detalhes && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.detalhes}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
