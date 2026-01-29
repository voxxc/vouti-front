import { useState } from 'react';
import { FlaskConical, Search, Loader2, FileText, CheckCircle2, XCircle, ChevronDown, ChevronUp, Paperclip } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TestResult {
  request_id: string;
  with_attachments_requested: boolean;
  numero_cnj: string;
  tribunal: string;
  classe: string;
  partes: {
    polo_ativo: any[];
    polo_passivo: any[];
  };
  attachments_count: number;
  attachments: Array<{
    attachment_id: string;
    name: string;
    status: string;
    mime_type?: string;
    size?: number;
    download_url?: string;
  }>;
  raw_response: any;
}

export function SuperAdminImportCNJTest() {
  const [numeroCnj, setNumeroCnj] = useState('');
  const [withAttachments, setWithAttachments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const handleTest = async () => {
    if (!numeroCnj.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite o número CNJ do processo',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      const response = await supabase.functions.invoke('judit-test-import-cnj', {
        body: {
          numeroCnj: numeroCnj.trim(),
          withAttachments,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro na chamada');
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setResult(response.data);
      toast({
        title: 'Teste concluído',
        description: `Processo encontrado com ${response.data.attachments_count} anexo(s)`,
      });
    } catch (err: any) {
      console.error('Erro no teste:', err);
      setError(err.message || 'Erro desconhecido');
      toast({
        title: 'Erro no teste',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatParteName = (parte: any) => {
    return parte.name || parte.nome || 'Nome não informado';
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <FlaskConical className="h-6 w-6" />
          Teste de Importação CNJ
        </h2>
        <p className="text-muted-foreground">
          Teste a importação de processos pela API Judit com controle sobre anexos. 
          Esta ferramenta <strong>não salva dados</strong> no banco.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Parâmetros do Teste</CardTitle>
          <CardDescription>
            Configure o teste de importação antes de executar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="cnj">Número CNJ</Label>
            <Input
              id="cnj"
              placeholder="0000000-00.0000.0.00.0000"
              value={numeroCnj}
              onChange={(e) => setNumeroCnj(e.target.value)}
              disabled={loading}
              className="font-mono"
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="space-y-1">
              <Label htmlFor="with-attachments" className="font-medium">
                Incluir Anexos
              </Label>
              <p className="text-sm text-muted-foreground">
                Habilita <code className="bg-muted px-1 rounded">with_attachments: true</code> na requisição
              </p>
            </div>
            <Switch
              id="with-attachments"
              checked={withAttachments}
              onCheckedChange={setWithAttachments}
              disabled={loading}
            />
          </div>

          <Button 
            onClick={handleTest} 
            disabled={loading || !numeroCnj.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Consultando API Judit...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Testar Importação
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Erro no Teste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Resultado do Teste
            </CardTitle>
            <CardDescription>
              Request ID: <code className="bg-muted px-1 rounded">{result.request_id}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resumo do Processo */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">CNJ</p>
                <p className="font-mono font-medium">{result.numero_cnj}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tribunal</p>
                <p className="font-medium">{result.tribunal}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Classe</p>
                <p className="font-medium">{result.classe}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">With Attachments</p>
                <Badge variant={result.with_attachments_requested ? 'default' : 'secondary'}>
                  {result.with_attachments_requested ? 'true' : 'false'}
                </Badge>
              </div>
            </div>

            {/* Partes */}
            <div className="space-y-3">
              <h4 className="font-medium">Partes do Processo</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Polo Ativo</p>
                  {result.partes.polo_ativo.length > 0 ? (
                    <ul className="space-y-1">
                      {result.partes.polo_ativo.map((p, i) => (
                        <li key={i} className="text-sm">{formatParteName(p)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma parte identificada</p>
                  )}
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Polo Passivo</p>
                  {result.partes.polo_passivo.length > 0 ? (
                    <ul className="space-y-1">
                      {result.partes.polo_passivo.map((p, i) => (
                        <li key={i} className="text-sm">{formatParteName(p)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma parte identificada</p>
                  )}
                </div>
              </div>
            </div>

            {/* Anexos */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                <h4 className="font-medium">Anexos</h4>
                <Badge variant={result.attachments_count > 0 ? 'default' : 'secondary'}>
                  {result.attachments_count} encontrado(s)
                </Badge>
              </div>
              
              {result.attachments.length > 0 ? (
                <div className="border rounded-lg divide-y">
                  {result.attachments.map((attachment, i) => (
                    <div key={i} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {attachment.attachment_id}
                            {attachment.mime_type && ` • ${attachment.mime_type}`}
                            {attachment.size && ` • ${(attachment.size / 1024).toFixed(1)} KB`}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={attachment.status === 'done' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {attachment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border rounded-lg bg-muted/50 text-center">
                  <p className="text-muted-foreground">
                    {result.with_attachments_requested 
                      ? 'Nenhum anexo retornado pela API' 
                      : 'Anexos não solicitados (with_attachments: false)'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* JSON Completo */}
            <Collapsible open={showRawJson} onOpenChange={setShowRawJson}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                  {showRawJson ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Ocultar JSON Completo
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Ver JSON Completo
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <ScrollArea className="h-96 border rounded-lg">
                  <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(result.raw_response, null, 2)}
                  </pre>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
