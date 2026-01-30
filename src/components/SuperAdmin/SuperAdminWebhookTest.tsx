import { useState, useEffect } from 'react';
import { Loader2, Send, FileJson, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface ProcessoComIds {
  id: string;
  numero_cnj: string;
  tracking_id: string | null;
  detalhes_request_id: string | null;
  tenant_id: string | null;
}

export function SuperAdminWebhookTest() {
  const [processos, setProcessos] = useState<ProcessoComIds[]>([]);
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoComIds | null>(null);
  const [payload, setPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProcessos, setLoadingProcessos] = useState(true);
  const [result, setResult] = useState<{
    success: boolean;
    status: number;
    data: unknown;
    error?: string;
  } | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    fetchProcessos();
  }, []);

  const fetchProcessos = async () => {
    setLoadingProcessos(true);
    try {
      const { data, error } = await supabase
        .from('processos_oab')
        .select('id, numero_cnj, tracking_id, detalhes_request_id, tenant_id')
        .or('tracking_id.not.is.null,detalhes_request_id.not.is.null')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setProcessos(data || []);
    } catch (error) {
      console.error('Erro ao buscar processos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os processos',
        variant: 'destructive',
      });
    } finally {
      setLoadingProcessos(false);
    }
  };

  const handleSelectProcesso = (processoId: string) => {
    const processo = processos.find(p => p.id === processoId);
    setSelectedProcesso(processo || null);
    setPayload('');
    setResult(null);
    setJsonError(null);
  };

  const generatePayload = (type: 'tracking' | 'request') => {
    if (!selectedProcesso) {
      toast({
        title: 'Selecione um processo',
        description: 'Escolha um processo antes de gerar o payload',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date().toISOString();
    let payloadObj: Record<string, unknown>;

    if (type === 'tracking') {
      if (!selectedProcesso.tracking_id) {
        toast({
          title: 'Sem tracking_id',
          description: 'Este processo não possui tracking_id',
          variant: 'destructive',
        });
        return;
      }

      payloadObj = {
        user_id: 'test-user',
        callback_id: 'test-callback-' + Date.now(),
        event_type: 'response_created',
        reference_type: 'tracking',
        reference_id: selectedProcesso.tracking_id,
        payload: {
          request_id: 'test-request-' + Date.now(),
          response_id: 'test-response-' + Date.now(),
          origin: 'tracking',
          origin_id: selectedProcesso.tracking_id,
          response_type: 'lawsuit',
          response_data: {
            code: selectedProcesso.numero_cnj,
            steps: [
              {
                step_date: now,
                content: 'Andamento de teste via tracking - ' + now,
                step_type: 'Despacho',
              },
            ],
          },
        },
      };
    } else {
      if (!selectedProcesso.detalhes_request_id) {
        toast({
          title: 'Sem detalhes_request_id',
          description: 'Este processo não possui detalhes_request_id',
          variant: 'destructive',
        });
        return;
      }

      payloadObj = {
        user_id: 'test-user',
        callback_id: 'test-callback-' + Date.now(),
        event_type: 'response_created',
        reference_type: 'request',
        reference_id: selectedProcesso.detalhes_request_id,
        payload: {
          request_id: selectedProcesso.detalhes_request_id,
          response_id: 'test-response-' + Date.now(),
          response_type: 'lawsuit',
          response_data: {
            code: selectedProcesso.numero_cnj,
            steps: [
              {
                step_date: now,
                content: 'Andamento de teste via request - ' + now,
                step_type: 'Sentença',
              },
            ],
          },
        },
      };
    }

    setPayload(JSON.stringify(payloadObj, null, 2));
    setJsonError(null);
    setResult(null);
  };

  const validateJson = (value: string): boolean => {
    try {
      JSON.parse(value);
      setJsonError(null);
      return true;
    } catch (e) {
      setJsonError('JSON inválido: ' + (e as Error).message);
      return false;
    }
  };

  const handlePayloadChange = (value: string) => {
    setPayload(value);
    if (value.trim()) {
      validateJson(value);
    } else {
      setJsonError(null);
    }
  };

  const dispararWebhook = async () => {
    if (!payload.trim()) {
      toast({
        title: 'Payload vazio',
        description: 'Gere ou insira um payload antes de disparar',
        variant: 'destructive',
      });
      return;
    }

    if (!validateJson(payload)) {
      toast({
        title: 'JSON inválido',
        description: 'Corrija o JSON antes de disparar',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const parsedPayload = JSON.parse(payload);
      
      const response = await fetch(
        'https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/judit-webhook-oab',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(parsedPayload),
        }
      );

      const data = await response.json();

      setResult({
        success: response.ok,
        status: response.status,
        data,
      });

      if (response.ok) {
        toast({
          title: 'Webhook disparado!',
          description: `Status: ${response.status}`,
        });
      } else {
        toast({
          title: 'Erro no webhook',
          description: data?.error || `Status: ${response.status}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setResult({
        success: false,
        status: 0,
        data: null,
        error: errorMessage,
      });
      toast({
        title: 'Erro ao disparar webhook',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Teste de Webhook Judit</h2>
        <p className="text-muted-foreground">
          Simule o disparo de payloads para o webhook judit-webhook-oab usando processos reais do banco
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Painel de Configuração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Configuração do Payload
            </CardTitle>
            <CardDescription>
              Selecione um processo e gere o payload automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Seletor de Processo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Processo</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchProcessos}
                  disabled={loadingProcessos}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingProcessos ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <Select
                value={selectedProcesso?.id || ''}
                onValueChange={handleSelectProcesso}
                disabled={loadingProcessos}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um processo..." />
                </SelectTrigger>
                <SelectContent>
                  {processos.map((processo) => (
                    <SelectItem key={processo.id} value={processo.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{processo.numero_cnj}</span>
                        <div className="flex gap-1">
                          {processo.tracking_id && (
                            <Badge variant="outline" className="text-xs">T</Badge>
                          )}
                          {processo.detalhes_request_id && (
                            <Badge variant="outline" className="text-xs">R</Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {processos.length === 0 && !loadingProcessos && (
                <p className="text-sm text-muted-foreground">
                  Nenhum processo com tracking_id ou detalhes_request_id encontrado
                </p>
              )}
            </div>

            {/* Info do Processo Selecionado */}
            {selectedProcesso && (
              <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                <div className="text-sm">
                  <span className="text-muted-foreground">CNJ:</span>{' '}
                  <span className="font-mono">{selectedProcesso.numero_cnj}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Tracking ID:</span>{' '}
                  <span className="font-mono text-xs">
                    {selectedProcesso.tracking_id || '—'}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Request ID:</span>{' '}
                  <span className="font-mono text-xs">
                    {selectedProcesso.detalhes_request_id || '—'}
                  </span>
                </div>
              </div>
            )}

            {/* Botões de Template */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => generatePayload('tracking')}
                disabled={!selectedProcesso || !selectedProcesso.tracking_id}
                className="flex-1"
              >
                Gerar Tracking
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generatePayload('request')}
                disabled={!selectedProcesso || !selectedProcesso.detalhes_request_id}
                className="flex-1"
              >
                Gerar Request
              </Button>
            </div>

            {/* Editor de Payload */}
            <div className="space-y-2">
              <Label>Payload JSON</Label>
              <Textarea
                value={payload}
                onChange={(e) => handlePayloadChange(e.target.value)}
                placeholder='{"event_type": "response_created", ...}'
                className="font-mono text-sm min-h-[300px]"
              />
              {jsonError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {jsonError}
                </p>
              )}
            </div>

            {/* Botão Disparar */}
            <Button
              onClick={dispararWebhook}
              disabled={loading || !payload.trim() || !!jsonError}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Disparar Webhook
            </Button>
          </CardContent>
        </Card>

        {/* Painel de Resultado */}
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>
              Resposta do webhook após o disparo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="font-medium">
                    {result.success ? 'Sucesso' : 'Erro'}
                  </span>
                  <Badge variant={result.success ? 'default' : 'destructive'}>
                    {result.status || 'Network Error'}
                  </Badge>
                </div>

                {/* Response Data */}
                <div className="space-y-2">
                  <Label>Resposta</Label>
                  <div className="rounded-lg border bg-muted/30 p-4 overflow-auto max-h-[400px]">
                    <pre className="font-mono text-sm whitespace-pre-wrap">
                      {result.error
                        ? result.error
                        : JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Send className="h-12 w-12 mb-4 opacity-20" />
                <p>Dispare o webhook para ver o resultado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Endpoint do Webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
            POST https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/judit-webhook-oab
          </code>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Legenda dos Badges</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">T</Badge>
                  <span>Possui tracking_id</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">R</Badge>
                  <span>Possui detalhes_request_id</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Tipos de Payload</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><strong>Tracking:</strong> Usa tracking_id como reference_id</p>
                <p><strong>Request:</strong> Usa detalhes_request_id como reference_id</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
