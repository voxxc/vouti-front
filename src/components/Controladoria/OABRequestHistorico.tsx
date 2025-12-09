import { useState, useEffect } from 'react';
import { History, RefreshCw, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RequestHistorico {
  id: string;
  request_id: string;
  on_demand: boolean;
  processos_encontrados: number | null;
  processos_novos: number | null;
  processos_atualizados: number | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface OABRequestHistoricoProps {
  oabId: string;
  oabNumero: string;
  oabUf: string;
}

export const OABRequestHistorico = ({ oabId, oabNumero, oabUf }: OABRequestHistoricoProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState<RequestHistorico[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistorico = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('oab_request_historico')
        .select('*')
        .eq('oab_id', oabId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (error) {
      console.error('Erro ao buscar historico:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHistorico();
    }
  }, [open, oabId]);

  const handleCopyRequestId = (requestId: string) => {
    navigator.clipboard.writeText(requestId);
    setCopiedId(requestId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido':
        return <Badge variant="default" className="bg-green-600">Concluido</Badge>;
      case 'processando':
        return <Badge variant="secondary" className="bg-yellow-600">Processando</Badge>;
      case 'erro':
      case 'timeout':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          title="Historico de buscas"
        >
          <History className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historico de Buscas - OAB {oabNumero}/{oabUf}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : historico.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma busca registrada
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Request ID</TableHead>
                <TableHead className="text-center">On Demand</TableHead>
                <TableHead className="text-center">Encontrados</TableHead>
                <TableHead className="text-center">Novos</TableHead>
                <TableHead className="text-center">Atualizados</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(item.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs truncate max-w-[150px]" title={item.request_id}>
                        {item.request_id.slice(0, 8)}...
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyRequestId(item.request_id)}
                      >
                        {copiedId === item.request_id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.on_demand ? (
                      <Badge variant="default" className="text-xs">Sim</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Nao</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {item.processos_encontrados ?? '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.processos_novos ?? '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.processos_atualizados ?? '-'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
