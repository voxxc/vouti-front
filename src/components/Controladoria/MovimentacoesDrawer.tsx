import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MovimentacoesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processo: any;
}

export const MovimentacoesDrawer = ({ open, onOpenChange, processo }: MovimentacoesDrawerProps) => {
  const { toast } = useToast();
  const [atualizacoes, setAtualizacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && processo?.id) {
      fetchAtualizacoes();
      setupRealtimeSubscription();
    }
  }, [open, processo?.id]);

  const fetchAtualizacoes = async () => {
    if (!processo?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('processo_atualizacoes_escavador')
        .select('*')
        .eq('processo_id', processo.id)
        .order('data_evento', { ascending: false });

      if (error) throw error;
      setAtualizacoes(data || []);
    } catch (error) {
      console.error('[Drawer] Erro ao buscar movimentações:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!processo?.id) return;

    const channel = supabase
      .channel(`movimentacoes_${processo.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'processo_atualizacoes_escavador',
        filter: `processo_id=eq.${processo.id}`
      }, (payload) => {
        console.log('[Drawer] Nova movimentação recebida:', payload.new);
        setAtualizacoes(prev => [payload.new, ...prev]);
        
        toast({
          title: "🔔 Nova movimentação processual",
          description: "Uma nova movimentação foi recebida",
          duration: 5000
        });
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  };

  const marcarLida = async (atualizacaoId: string) => {
    try {
      const { error } = await supabase
        .from('processo_atualizacoes_escavador')
        .update({ lida: true })
        .eq('id', atualizacaoId);

      if (error) throw error;

      setAtualizacoes(prev =>
        prev.map(a => a.id === atualizacaoId ? { ...a, lida: true } : a)
      );

      toast({
        title: "Marcado como lida",
        description: "Movimentação marcada como lida",
      });
    } catch (error) {
      console.error('[Drawer] Erro ao marcar como lida:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar como lida",
        variant: 'destructive'
      });
    }
  };

  const historicas = atualizacoes.filter(a => a.tipo_atualizacao === 'importacao_historica');
  const novas = atualizacoes.filter(a => a.tipo_atualizacao !== 'importacao_historica' || !a.lida);
  const naoLidas = atualizacoes.filter(a => !a.lida).length;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl ml-auto h-full">
        <DrawerHeader>
          <DrawerTitle>
            Movimentações - Processo {processo?.numero_processo}
          </DrawerTitle>
          <DrawerDescription>
            {atualizacoes.length} andamento{atualizacoes.length !== 1 ? 's' : ''} processual{atualizacoes.length !== 1 ? 'is' : ''} registrado{atualizacoes.length !== 1 ? 's' : ''}
            {naoLidas > 0 && (
              <Badge className="ml-2" variant="destructive">
                {naoLidas} não lida{naoLidas !== 1 ? 's' : ''}
              </Badge>
            )}
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4">
          <Tabs defaultValue="todas">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="todas">
                Todas ({atualizacoes.length})
              </TabsTrigger>
              <TabsTrigger value="historicas">
                Históricas ({historicas.length})
              </TabsTrigger>
              <TabsTrigger value="novas">
                Novas ({novas.length})
                {novas.length > 0 && (
                  <div className="ml-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="todas" className="mt-4">
              <ScrollArea className="h-[calc(100vh-250px)]">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
                  </div>
                ) : atualizacoes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma movimentação encontrada
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {atualizacoes.map(mov => (
                      <MovimentacaoCard key={mov.id} movimentacao={mov} onMarcarLida={marcarLida} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="historicas" className="mt-4">
              <ScrollArea className="h-[calc(100vh-250px)]">
                {historicas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma movimentação histórica
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {historicas.map(mov => (
                      <MovimentacaoCard key={mov.id} movimentacao={mov} onMarcarLida={marcarLida} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="novas" className="mt-4">
              <ScrollArea className="h-[calc(100vh-250px)]">
                {novas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma movimentação nova
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {novas.map(mov => (
                      <MovimentacaoCard key={mov.id} movimentacao={mov} onMarcarLida={marcarLida} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

interface MovimentacaoCardProps {
  movimentacao: any;
  onMarcarLida: (id: string) => void;
}

const MovimentacaoCard = ({ movimentacao, onMarcarLida }: MovimentacaoCardProps) => {
  const { id, tipo_atualizacao, descricao, data_evento, lida, dados_completos } = movimentacao;

  return (
    <Card className={!lida ? "border-l-4 border-l-primary" : ""}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={lida ? "secondary" : "default"}>
                {tipo_atualizacao === 'importacao_historica' ? '📚 Histórica' : '🆕 Nova'}
              </Badge>
              {!lida && (
                <Badge variant="destructive">Não lida</Badge>
              )}
            </div>
            <CardTitle className="text-sm">
              {format(new Date(data_evento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </CardTitle>
          </div>
          {!lida && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onMarcarLida(id)}
            >
              <Check className="h-4 w-4 mr-1" />
              Marcar como lida
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{descricao}</p>
        
        <Collapsible className="mt-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronDown className="h-4 w-4 mr-1" />
              Ver dados completos
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-48">
              {JSON.stringify(dados_completos, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
