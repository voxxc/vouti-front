import { useEffect, useState } from 'react';
import { FileText, Loader2, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TestJob {
  id: string;
  numero_cnj: string;
  request_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  publicacao_id: string | null;
  storage_path: string | null;
  attachment_name: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABEL: Record<TestJob['status'], string> = {
  pending: 'Pendente',
  processing: 'Processando',
  completed: 'Concluído',
  failed: 'Falhou',
};

export function SuperAdminTestPublicacaoCNJ() {
  const [numeroCnj, setNumeroCnj] = useState('');
  const [requestId, setRequestId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState<TestJob[]>([]);

  const loadJobs = async () => {
    const { data, error } = await supabase
      .from('publicacao_test_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error && data) setJobs(data as TestJob[]);
  };

  useEffect(() => {
    loadJobs();
    const channel = supabase
      .channel('publicacao-test-jobs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'publicacao_test_jobs' },
        () => loadJobs(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async () => {
    if (!numeroCnj.trim() && !requestId.trim()) {
      toast({ title: 'Informe o CNJ ou o Request ID', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('judit-test-publicacao-cnj', {
        body: {
          numero_cnj: numeroCnj.trim() || undefined,
          request_id: requestId.trim() || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: 'Teste iniciado',
        description: 'O card aparecerá abaixo e será atualizado em tempo real.',
      });
      setNumeroCnj('');
      setRequestId('');
      loadJobs();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const abrirPdf = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('processo-documentos')
      .createSignedUrl(path, 600);
    if (error || !data?.signedUrl) {
      toast({ title: 'Erro ao abrir', description: error?.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const statusIcon = (s: TestJob['status']) => {
    if (s === 'completed') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (s === 'failed') return <XCircle className="h-4 w-4 text-destructive" />;
    if (s === 'processing') return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const statusVariant = (s: TestJob['status']) =>
    s === 'completed' ? 'default' : s === 'failed' ? 'destructive' : 'secondary';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" /> Teste de Publicação via CNJ
        </h2>
        <p className="text-muted-foreground">
          Gera uma publicação real no tenant <strong>Demorais</strong> com o último documento anexado pela Judit.
          O processamento roda em background — o card abaixo atualiza sozinho.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Novo teste</CardTitle>
          <CardDescription>Cole o CNJ <strong>ou</strong> um Request ID já existente da Judit (reaproveita resposta).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cnj-pub">Número CNJ</Label>
            <Input
              id="cnj-pub"
              placeholder="0000000-00.0000.0.00.0000"
              value={numeroCnj}
              onChange={(e) => setNumeroCnj(e.target.value)}
              disabled={submitting}
              className="font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="req-pub">Request ID Judit (opcional, reaproveita request existente)</Label>
            <Input
              id="req-pub"
              placeholder="0e27516b-43aa-48af-a7af-9f1194236afb"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              disabled={submitting}
              className="font-mono text-xs"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || (!numeroCnj.trim() && !requestId.trim())}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Disparando…
              </>
            ) : (
              'Gerar publicação de teste'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico recente</CardTitle>
          <CardDescription>Últimos 20 jobs. Atualização em tempo real.</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum teste ainda.</p>
          ) : (
            <div className="divide-y border rounded-lg">
              {jobs.map((job) => (
                <div key={job.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {statusIcon(job.status)}
                    <div className="min-w-0">
                      <p className="font-mono text-sm truncate">{job.numero_cnj}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(job.created_at), 'dd/MM/yyyy HH:mm')}
                        {job.request_id && ` • req: ${job.request_id.slice(0, 8)}…`}
                        {job.attachment_name && ` • ${job.attachment_name}`}
                        {job.error_message && ` • ${job.error_message}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={statusVariant(job.status) as any}>{STATUS_LABEL[job.status]}</Badge>
                    {job.status === 'completed' && job.storage_path && (
                      <Button size="sm" variant="outline" onClick={() => abrirPdf(job.storage_path!)}>
                        <ExternalLink className="h-3 w-3 mr-1" /> Abrir PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
