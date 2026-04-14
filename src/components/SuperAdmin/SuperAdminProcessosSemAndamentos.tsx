import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProcessoSemAndamento {
  id: string;
  numero_cnj: string;
  tribunal: string | null;
  created_at: string;
  monitoramento_ativo: boolean;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  created_by: string | null;
  detalhes_carregados: boolean;
}

export const SuperAdminProcessosSemAndamentos = () => {
  const [processos, setProcessos] = useState<ProcessoSemAndamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessando, setReprocessando] = useState<string | null>(null);

  const fetchProcessos = async () => {
    setLoading(true);
    try {
      // Buscar processos_oab que não têm andamentos
      const { data, error } = await supabase
        .from('processos_oab')
        .select(`
          id,
          numero_cnj,
          tribunal,
          created_at,
          monitoramento_ativo,
          tenant_id,
          created_by,
          detalhes_carregados,
          tenants!inner(slug, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrar os que não têm andamentos
      const processoIds = (data || []).map((p: any) => p.id);
      
      if (processoIds.length === 0) {
        setProcessos([]);
        return;
      }

      // Buscar quais têm andamentos
      const { data: comAndamentos } = await supabase
        .from('processos_oab_andamentos')
        .select('processo_oab_id')
        .in('processo_oab_id', processoIds);

      const idsComAndamentos = new Set((comAndamentos || []).map((a: any) => a.processo_oab_id));

      const semAndamentos = (data || [])
        .filter((p: any) => !idsComAndamentos.has(p.id))
        .map((p: any) => ({
          id: p.id,
          numero_cnj: p.numero_cnj,
          tribunal: p.tribunal,
          created_at: p.created_at,
          monitoramento_ativo: p.monitoramento_ativo,
          tenant_id: p.tenant_id,
          tenant_slug: (p.tenants as any)?.slug || '—',
          tenant_name: (p.tenants as any)?.name || '—',
          created_by: p.created_by,
          detalhes_carregados: p.detalhes_carregados ?? false,
        }));

      setProcessos(semAndamentos);
    } catch (err: any) {
      console.error('Erro ao buscar processos sem andamentos:', err);
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessos();
  }, []);

  const handleReprocessar = async (processo: ProcessoSemAndamento) => {
    setReprocessando(processo.id);
    try {
      const { data, error } = await supabase.functions.invoke('judit-buscar-detalhes-processo', {
        body: {
          processoOabId: processo.id,
          numeroCnj: processo.numero_cnj,
          tenantId: processo.tenant_id,
          userId: processo.created_by,
        }
      });

      if (error) throw error;

      toast({
        title: '✅ Reprocessado',
        description: `${data?.andamentosInseridos || 0} andamentos inseridos para ${processo.numero_cnj}`,
      });

      fetchProcessos();
    } catch (err: any) {
      toast({
        title: 'Erro ao reprocessar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setReprocessando(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Processos sem Andamentos</h2>
          <p className="text-muted-foreground">
            Processos importados que não possuem nenhum andamento registrado
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProcessos} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            {processos.length} processo{processos.length !== 1 ? 's' : ''} sem andamentos
          </CardTitle>
          <CardDescription>
            Esses processos podem precisar de reprocessamento manual
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : processos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Todos os processos possuem andamentos ✅
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Número CNJ</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead>Importado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{p.tenant_name}</span>
                        <span className="text-xs text-muted-foreground">{p.tenant_slug}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{p.numero_cnj}</TableCell>
                    <TableCell>{p.tribunal || '—'}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {p.monitoramento_ativo && (
                          <Badge variant="outline" className="text-xs">Monitorado</Badge>
                        )}
                        {p.detalhes_carregados ? (
                          <Badge variant="secondary" className="text-xs">Detalhes OK</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">Sem detalhes</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReprocessar(p)}
                        disabled={reprocessando === p.id}
                      >
                        {reprocessando === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-1">Reprocessar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
