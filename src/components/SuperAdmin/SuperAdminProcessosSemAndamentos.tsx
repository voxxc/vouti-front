import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertTriangle, SearchX } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProcessoComProblema {
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
  motivo: 'sem_andamentos' | 'not_found';
}

export const SuperAdminProcessosSemAndamentos = () => {
  const [processos, setProcessos] = useState<ProcessoComProblema[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessando, setReprocessando] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState('todos');

  const fetchProcessos = async () => {
    setLoading(true);
    try {
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
          capa_completa,
          detalhes_completos,
          tenants!inner(slug, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allProcessos = data || [];
      
      // Identificar processos NOT_FOUND
      const notFoundIds = new Set<string>();
      allProcessos.forEach((p: any) => {
        const capa = p.capa_completa || {};
        const detalhes = p.detalhes_completos || {};
        if (capa?.code === 2 || detalhes?.code === 2 || detalhes?.message === 'LAWSUIT_NOT_FOUND' || capa?.message === 'LAWSUIT_NOT_FOUND') {
          notFoundIds.add(p.id);
        }
      });

      // Buscar quais têm andamentos
      const processoIds = allProcessos.map((p: any) => p.id);
      
      let idsComAndamentos = new Set<string>();
      if (processoIds.length > 0) {
        const { data: comAndamentos } = await supabase
          .from('processos_oab_andamentos')
          .select('processo_oab_id')
          .in('processo_oab_id', processoIds);
        idsComAndamentos = new Set((comAndamentos || []).map((a: any) => a.processo_oab_id));
      }

      const resultado: ProcessoComProblema[] = [];

      allProcessos.forEach((p: any) => {
        const isNotFound = notFoundIds.has(p.id);
        const semAndamentos = !idsComAndamentos.has(p.id);

        if (!isNotFound && !semAndamentos) return;

        resultado.push({
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
          motivo: isNotFound ? 'not_found' : 'sem_andamentos',
        });
      });

      setProcessos(resultado);
    } catch (err: any) {
      console.error('Erro ao buscar processos com problemas:', err);
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessos();
  }, []);

  const handleReprocessar = async (processo: ProcessoComProblema) => {
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

  const processosFiltrados = processos.filter(p => {
    if (abaAtiva === 'not_found') return p.motivo === 'not_found';
    if (abaAtiva === 'sem_andamentos') return p.motivo === 'sem_andamentos';
    return true;
  });

  const countNotFound = processos.filter(p => p.motivo === 'not_found').length;
  const countSemAndamentos = processos.filter(p => p.motivo === 'sem_andamentos').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Processos com Problemas</h2>
          <p className="text-muted-foreground">
            Processos sem andamentos ou não encontrados nas bases judiciais
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProcessos} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <TabsList>
          <TabsTrigger value="todos">
            Todos ({processos.length})
          </TabsTrigger>
          <TabsTrigger value="not_found">
            <SearchX className="h-3.5 w-3.5 mr-1" />
            Não encontrados ({countNotFound})
          </TabsTrigger>
          <TabsTrigger value="sem_andamentos">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Sem andamentos ({countSemAndamentos})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={abaAtiva}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                {processosFiltrados.length} processo{processosFiltrados.length !== 1 ? 's' : ''}
              </CardTitle>
              <CardDescription>
                Esses processos podem precisar de reprocessamento manual ou verificação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : processosFiltrados.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum processo com problemas nesta categoria ✅
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Número CNJ</TableHead>
                      <TableHead>Tribunal</TableHead>
                      <TableHead>Importado em</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processosFiltrados.map((p) => (
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
                          {p.motivo === 'not_found' ? (
                            <Badge variant="destructive" className="text-xs">
                              <SearchX className="w-3 h-3 mr-1" />
                              Não encontrado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Sem andamentos
                            </Badge>
                          )}
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
        </TabsContent>
      </Tabs>
    </div>
  );
};
