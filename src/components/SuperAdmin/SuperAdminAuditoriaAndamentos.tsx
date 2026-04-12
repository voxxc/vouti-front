import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

export function SuperAdminAuditoriaAndamentos() {
  const [executando, setExecutando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [filtroProblema, setFiltroProblema] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const { data: auditorias, refetch } = useQuery({
    queryKey: ['auditoria-andamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditoria_andamentos')
        .select('*')
        .order('executado_em', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const executarRevisao = async (modo: string) => {
    setExecutando(true);
    setProgresso(10);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      setProgresso(30);

      const { data, error } = await supabase.functions.invoke('reprocessar-andamentos-monitorados', {
        body: { modo, executadoPor: userId },
      });

      setProgresso(90);

      if (error) throw error;

      toast({
        title: 'Revisão concluída',
        description: `${data.processados} processos revisados`,
      });

      setProgresso(100);
      await refetch();
    } catch (err: any) {
      toast({
        title: 'Erro na revisão',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setExecutando(false);
        setProgresso(0);
      }, 1000);
    }
  };

  const auditoriasFiltradas = (auditorias || []).filter((a: any) => {
    if (filtroProblema !== 'todos' && a.problema !== filtroProblema) return false;
    if (filtroStatus === 'sucesso' && !a.sucesso) return false;
    if (filtroStatus === 'erro' && a.sucesso) return false;
    return true;
  });

  const totalRevisados = auditorias?.length || 0;
  const totalSucesso = auditorias?.filter((a: any) => a.sucesso).length || 0;
  const totalErro = auditorias?.filter((a: any) => !a.sucesso).length || 0;
  const totalInseridos = auditorias?.reduce((acc: number, a: any) => acc + (a.andamentos_inseridos || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Auditoria de Andamentos</h2>
        <p className="text-muted-foreground">
          Revise e corrija processos monitorados sem movimentações ou desatualizados
        </p>
      </div>

      {/* Ações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Executar Revisão</CardTitle>
          <CardDescription>
            Escolha o tipo de revisão para executar. GET no tracking é gratuito.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => executarRevisao('sem_andamentos')}
              disabled={executando}
              className="gap-2"
            >
              {executando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Processos sem Andamentos
            </Button>
            <Button
              onClick={() => executarRevisao('desatualizados')}
              disabled={executando}
              variant="outline"
              className="gap-2"
            >
              {executando ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Processos Desatualizados
            </Button>
            <Button
              onClick={() => executarRevisao('ambos')}
              disabled={executando}
              variant="secondary"
              className="gap-2"
            >
              {executando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Revisão Completa
            </Button>
          </div>

          {executando && (
            <div className="space-y-2">
              <Progress value={progresso} className="h-2" />
              <p className="text-sm text-muted-foreground">Processando...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo */}
      {totalRevisados > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{totalRevisados}</p>
              <p className="text-sm text-muted-foreground">Revisados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-600">{totalSucesso}</p>
              <p className="text-sm text-muted-foreground">Corrigidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-red-600">{totalErro}</p>
              <p className="text-sm text-muted-foreground">Com Erro</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{totalInseridos}</p>
              <p className="text-sm text-muted-foreground">Andamentos Inseridos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-4">
        <Select value={filtroProblema} onValueChange={setFiltroProblema}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo de problema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os problemas</SelectItem>
            <SelectItem value="sem_andamentos">Sem andamentos</SelectItem>
            <SelectItem value="desatualizado">Desatualizado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="sucesso">Sucesso</SelectItem>
            <SelectItem value="erro">Com erro</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CNJ</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Problema</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead className="text-center">Antes</TableHead>
                <TableHead className="text-center">Depois</TableHead>
                <TableHead className="text-center">Inseridos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditoriasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhum registro de auditoria encontrado
                  </TableCell>
                </TableRow>
              ) : (
                auditoriasFiltradas.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">
                      {a.numero_cnj || '—'}
                    </TableCell>
                    <TableCell className="text-sm">{a.tenant_nome || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={a.problema === 'sem_andamentos' ? 'destructive' : 'secondary'}>
                        {a.problema === 'sem_andamentos' ? 'Sem andamentos' : 'Desatualizado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.acao_tomada?.replace(/_/g, ' ') || '—'}
                    </TableCell>
                    <TableCell className="text-center">{a.andamentos_antes}</TableCell>
                    <TableCell className="text-center font-medium">{a.andamentos_depois}</TableCell>
                    <TableCell className="text-center">
                      {a.andamentos_inseridos > 0 ? (
                        <Badge variant="default" className="bg-green-600">+{a.andamentos_inseridos}</Badge>
                      ) : '0'}
                    </TableCell>
                    <TableCell>
                      {a.sucesso ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.executado_em ? new Date(a.executado_em).toLocaleString('pt-BR') : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
