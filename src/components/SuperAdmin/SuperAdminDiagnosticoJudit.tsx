import { useState } from 'react';
import { Search, Loader2, CheckCircle2, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DiagnosticoResult {
  success: boolean;
  tracking_id: string;
  request_id_atual: string | null;
  processo_info: {
    processo_id: string;
    numero_cnj: string;
    detalhes_request_id_banco: string | null;
    monitoramento_ativo: boolean;
    tenant_id: string;
  } | null;
  comparacao: {
    request_id_judit: string | null;
    request_id_banco: string | null;
    sao_diferentes: boolean;
    status: string;
  } | null;
  raw_response: unknown;
  consultado_em: string;
  error?: string;
}

export function SuperAdminDiagnosticoJudit() {
  const [searchType, setSearchType] = useState<'tracking' | 'cnj'>('cnj');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticoResult | null>(null);

  const handleConsultar = async () => {
    if (!inputValue.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe um tracking_id ou número CNJ',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({ title: 'Erro', description: 'Sessão expirada', variant: 'destructive' });
        return;
      }

      const payload = searchType === 'tracking' 
        ? { trackingId: inputValue.trim() }
        : { numeroCnj: inputValue.trim() };

      const response = await fetch(
        `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/judit-consultar-tracking`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setResult({ ...data, success: false });
        toast({
          title: 'Erro na consulta',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        });
      } else {
        setResult(data);
        toast({
          title: 'Consulta realizada',
          description: `Tracking ID: ${data.tracking_id}`,
        });
      }
    } catch (error) {
      console.error('Erro ao consultar:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao conectar com a API',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: `${label} copiado para a área de transferência` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Diagnóstico Judit</h2>
        <p className="text-muted-foreground">
          Consulte diretamente o status de um tracking na API Judit para verificar se há novos request_ids disponíveis
        </p>
      </div>

      {/* Formulário de busca */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Consultar Tracking</CardTitle>
          <CardDescription>
            Busque por número CNJ ou tracking_id para ver o status atual na Judit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as 'tracking' | 'cnj')}>
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="cnj">Número CNJ</TabsTrigger>
              <TabsTrigger value="tracking">Tracking ID</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="search-input" className="sr-only">
                {searchType === 'cnj' ? 'Número CNJ' : 'Tracking ID'}
              </Label>
              <Input
                id="search-input"
                placeholder={searchType === 'cnj' 
                  ? 'Ex: 0045144-39.2025.8.16.0021' 
                  : 'Ex: f4f02f6d-0b2a-4381-bf89-2202505e2291'
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConsultar()}
                disabled={loading}
              />
            </div>
            <Button onClick={handleConsultar} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Consultar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {result && (
        <div className="space-y-4">
          {/* Status geral */}
          <Card className={result.success ? 'border-green-500/50' : 'border-destructive/50'}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  {result.success ? 'Consulta bem-sucedida' : 'Erro na consulta'}
                </CardTitle>
                {result.consultado_em && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(result.consultado_em).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.error && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-destructive">{result.error}</p>
                </div>
              )}

              {result.success && (
                <>
                  {/* Tracking ID */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Tracking ID:</span>
                    <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      {result.tracking_id}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(result.tracking_id, 'Tracking ID')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Comparação */}
                  {result.comparacao && (
                    <div className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={result.comparacao.sao_diferentes ? 'default' : 'secondary'}
                        >
                          {result.comparacao.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase font-medium">
                            Request ID da Judit (atual)
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-muted rounded text-xs font-mono break-all">
                              {result.comparacao.request_id_judit || 'N/A'}
                            </code>
                            {result.comparacao.request_id_judit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => copyToClipboard(result.comparacao!.request_id_judit!, 'Request ID Judit')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase font-medium">
                            Request ID no Banco
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-muted rounded text-xs font-mono break-all">
                              {result.comparacao.request_id_banco || 'N/A'}
                            </code>
                            {result.comparacao.request_id_banco && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => copyToClipboard(result.comparacao!.request_id_banco!, 'Request ID Banco')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info do processo */}
                  {result.processo_info && (
                    <div className="p-4 border rounded-lg space-y-2">
                      <p className="text-sm font-medium">Informações do Processo</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">CNJ:</span>{' '}
                          <span className="font-mono">{result.processo_info.numero_cnj}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Monitoramento:</span>{' '}
                          <Badge variant={result.processo_info.monitoramento_ativo ? 'default' : 'secondary'}>
                            {result.processo_info.monitoramento_ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* JSON completo */}
          {result.raw_response && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resposta Completa da Judit</CardTitle>
                <CardDescription>
                  JSON bruto retornado pela API para debug
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded border">
                  <pre className="p-4 text-xs font-mono">
                    {JSON.stringify(result.raw_response, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
