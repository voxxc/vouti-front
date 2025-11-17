import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AndamentosDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processo: any;
}

export const AndamentosDrawer = ({ open, onOpenChange, processo }: AndamentosDrawerProps) => {
  const [andamentos, setAndamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchAndamentos = async () => {
    if (!processo?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('processo_andamentos_judit')
        .select('*')
        .eq('processo_id', processo.id)
        .order('data_movimentacao', { ascending: false });

      if (error) throw error;
      setAndamentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar andamentos:', error);
      toast({
        title: 'Erro ao carregar andamentos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAndamentos();
    setRefreshing(false);
    toast({ title: 'Andamentos atualizados' });
  };

  const marcarLido = async (andamentoId: string) => {
    try {
      const { error } = await supabase
        .from('processo_andamentos_judit')
        .update({ lida: true })
        .eq('id', andamentoId);

      if (error) throw error;

      setAndamentos(prev =>
        prev.map(a => (a.id === andamentoId ? { ...a, lida: true } : a))
      );
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAndamentos();
    }
  }, [open, processo?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!processo?.id || !open) return;

    const channel = supabase
      .channel('andamentos-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'processo_andamentos_judit',
          filter: `processo_id=eq.${processo.id}`,
        },
        () => {
          fetchAndamentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processo?.id, open]);

  const naoLidos = andamentos.filter(a => !a.lida);
  const todos = andamentos;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Andamentos Processuais
          </DrawerTitle>
          <DrawerDescription>
            Processo: {processo?.numero_processo}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Badge variant="outline">
                {andamentos.length} total
              </Badge>
              <Badge variant="destructive">
                {naoLidos.length} não lidos
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Tabs defaultValue="todos" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="todos">Todos ({todos.length})</TabsTrigger>
              <TabsTrigger value="nao-lidos">Não lidos ({naoLidos.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="todos" className="mt-4">
              <ScrollArea className="h-[50vh]">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : todos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum andamento encontrado
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {todos.map((andamento) => (
                      <AndamentoCard
                        key={andamento.id}
                        andamento={andamento}
                        onMarcarLido={marcarLido}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="nao-lidos" className="mt-4">
              <ScrollArea className="h-[50vh]">
                {naoLidos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum andamento não lido
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {naoLidos.map((andamento) => (
                      <AndamentoCard
                        key={andamento.id}
                        andamento={andamento}
                        onMarcarLido={marcarLido}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Fechar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

interface AndamentoCardProps {
  andamento: any;
  onMarcarLido: (id: string) => void;
}

const AndamentoCard = ({ andamento, onMarcarLido }: AndamentoCardProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={!andamento.lida ? 'border-primary' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {andamento.tipo_movimentacao}
              </Badge>
              {!andamento.lida && (
                <Badge variant="destructive" className="text-xs">
                  Novo
                </Badge>
              )}
            </div>
            
            <p className="text-sm font-medium">
              {andamento.descricao}
            </p>
            
            <p className="text-xs text-muted-foreground">
              {andamento.data_movimentacao &&
                format(new Date(andamento.data_movimentacao), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
            </p>

            {expanded && andamento.dados_completos && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(andamento.dados_completos, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {!andamento.lida && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMarcarLido(andamento.id)}
              >
                Marcar lido
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Menos' : 'Mais'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
