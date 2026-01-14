import { useState, useEffect } from 'react';
import { Link2, Unlink, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProtocoloVinculo } from '@/hooks/useProtocoloVinculo';
import { useToast } from '@/hooks/use-toast';

interface ProtocoloVinculoTabProps {
  protocoloId: string;
  processoOabId: string | null | undefined;
  onVinculoChange: (novoProcessoOabId: string | null) => void;
}

export const ProtocoloVinculoTab = ({ protocoloId, processoOabId, onVinculoChange }: ProtocoloVinculoTabProps) => {
  const [busca, setBusca] = useState('');
  const [mostrarBusca, setMostrarBusca] = useState(false);
  const { toast } = useToast();

  const {
    processoVinculado,
    processosDisponiveis,
    loading,
    loadingProcessos,
    fetchProcessosDisponiveis,
  } = useProtocoloVinculo(protocoloId, processoOabId);

  useEffect(() => {
    if (mostrarBusca) {
      fetchProcessosDisponiveis(busca);
    }
  }, [mostrarBusca, busca, fetchProcessosDisponiveis]);

  const handleVincular = async (novoProcessoId: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('project_protocolos')
        .update({ processo_oab_id: novoProcessoId })
        .eq('id', protocoloId);

      if (error) throw error;

      onVinculoChange(novoProcessoId);
      setMostrarBusca(false);
      setBusca('');
      toast({ title: 'Processo vinculado com sucesso' });
    } catch (error) {
      console.error('Erro ao vincular:', error);
      toast({ title: 'Erro ao vincular processo', variant: 'destructive' });
    }
  };

  const handleDesvincular = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('project_protocolos')
        .update({ processo_oab_id: null })
        .eq('id', protocoloId);

      if (error) throw error;

      onVinculoChange(null);
      toast({ title: 'Processo desvinculado' });
    } catch (error) {
      console.error('Erro ao desvincular:', error);
      toast({ title: 'Erro ao desvincular processo', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (processoVinculado) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Processo Vinculado
          </h3>
          <Button variant="outline" size="sm" onClick={handleDesvincular}>
            <Unlink className="h-4 w-4 mr-1" />
            Desvincular
          </Button>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-sm font-medium">{processoVinculado.numero_cnj}</p>
                <p className="text-xs text-muted-foreground">
                  {processoVinculado.tribunal || processoVinculado.tribunal_sigla}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {processoVinculado.status_processual || 'Ativo'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Autor</span>
                <span className="truncate block">{processoVinculado.parte_ativa || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Réu</span>
                <span className="truncate block">{processoVinculado.parte_passiva || '-'}</span>
              </div>
            </div>

            {processoVinculado.oab && (
              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground block">Advogado</span>
                <span className="text-sm">
                  {processoVinculado.oab.nome_advogado || `OAB ${processoVinculado.oab.oab_numero}/${processoVinculado.oab.oab_uf}`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Vincular a um Processo</h3>
        {!mostrarBusca && (
          <Button size="sm" onClick={() => setMostrarBusca(true)}>
            <Search className="h-4 w-4 mr-1" />
            Buscar Processo
          </Button>
        )}
      </div>

      {!mostrarBusca ? (
        <div className="text-center py-8 text-muted-foreground">
          <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhum processo vinculado</p>
          <p className="text-xs">Clique em "Buscar Processo" para vincular este protocolo a um processo da Controladoria</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por CNJ, autor ou réu..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={() => setMostrarBusca(false)}>
              Cancelar
            </Button>
          </div>

          <ScrollArea className="h-[250px]">
            {loadingProcessos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : processosDisponiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum processo encontrado
              </p>
            ) : (
              <div className="space-y-2">
                {processosDisponiveis.map((processo) => (
                  <Card
                    key={processo.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleVincular(processo.id)}
                  >
                    <CardContent className="p-3">
                      <p className="font-mono text-sm font-medium">{processo.numero_cnj}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {processo.parte_ativa || 'Autor'} x {processo.parte_passiva || 'Réu'}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {processo.tribunal_sigla || processo.tribunal}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
