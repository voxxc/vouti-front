import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Key, Eye, EyeOff, FileText, Send, Loader2, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useTenantCredenciais } from '@/hooks/useTenantCredenciais';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TenantCredenciaisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

export function TenantCredenciaisDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}: TenantCredenciaisDialogProps) {
  const { credenciaisCliente, credenciaisJudit, isLoading, enviarParaJudit } = useTenantCredenciais(tenantId);
  const [senhasVisiveis, setSenhasVisiveis] = useState<Record<string, boolean>>({});
  const [selectedCredencialId, setSelectedCredencialId] = useState<string>('');
  const [secret, setSecret] = useState('');
  const [customerKey, setCustomerKey] = useState('');
const [enviando, setEnviando] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const toggleSenhaVisivel = (id: string) => {
    setSenhasVisiveis((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const credenciaisPendentes = credenciaisCliente.filter((c) => c.status === 'pendente');
  const selectedCredencial = credenciaisCliente.find((c) => c.id === selectedCredencialId);

  // Atualizar customerKey quando selecionar credencial
  const handleSelectCredencial = (id: string) => {
    setSelectedCredencialId(id);
    const cred = credenciaisCliente.find((c) => c.id === id);
    if (cred) {
      const defaultKey = cred.oabs_cadastradas
        ? `${cred.oabs_cadastradas.oab_numero}/${cred.oabs_cadastradas.oab_uf}`
        : cred.cpf;
      setCustomerKey(defaultKey);
    }
  };

  const handleEnviarParaJudit = async () => {
    if (!selectedCredencial || !customerKey) return;

    setEnviando(true);
    try {
      await enviarParaJudit.mutateAsync({
        credencialId: selectedCredencial.id,
        cpf: selectedCredencial.cpf,
        senha: selectedCredencial.senha,
        secret,
        customerKey,
        oabId: selectedCredencial.oab_id || undefined,
      });

      setSelectedCredencialId('');
      setSecret('');
      setCustomerKey('');
    } finally {
      setEnviando(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>;
      case 'enviado':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Enviado</Badge>;
      case 'erro':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCpf = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleDownloadDocumento = async (url: string, nome: string, id: string) => {
    setDownloadingId(id);
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo');
      }
      
      // Pegar o content-type da resposta
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const blob = await response.blob();
      
      // Criar blob com o tipo correto
      const blobWithType = new Blob([blob], { type: contentType });
      
      // Extrair extensão da URL se o nome não tiver
      let nomeArquivo = nome || 'documento';
      if (!nomeArquivo.includes('.')) {
        // Tentar extrair extensão da URL
        try {
          const urlPath = new URL(url).pathname;
          const extensao = urlPath.substring(urlPath.lastIndexOf('.'));
          if (extensao && extensao.length <= 5 && extensao.includes('.')) {
            nomeArquivo += extensao;
          }
        } catch {
          // URL inválida, manter nome sem extensão
        }
      }
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blobWithType);
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      toast.error('Erro ao baixar documento');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Credenciais - {tenantName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="recebidas" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recebidas">
              Credenciais Recebidas
              {credenciaisPendentes.length > 0 && (
                <Badge variant="secondary" className="ml-2">{credenciaisPendentes.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="enviar">Enviar para Judit</TabsTrigger>
            <TabsTrigger value="historico">Histórico Judit</TabsTrigger>
          </TabsList>

          {/* Aba: Credenciais Recebidas */}
          <TabsContent value="recebidas" className="mt-4">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : credenciaisCliente.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma credencial recebida deste tenant.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OAB</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Senha</TableHead>
                      <TableHead>Secret</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credenciaisCliente.map((credencial) => (
                      <TableRow key={credencial.id}>
                        <TableCell>
                          {credencial.oabs_cadastradas ? (
                            <div>
                              <div className="font-medium">
                                {credencial.oabs_cadastradas.oab_numero}/{credencial.oabs_cadastradas.oab_uf}
                              </div>
                              {credencial.oabs_cadastradas.nome_advogado && (
                                <div className="text-xs text-muted-foreground">
                                  {credencial.oabs_cadastradas.nome_advogado}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{formatCpf(credencial.cpf)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">
                              {senhasVisiveis[credencial.id] ? credencial.senha : '••••••••'}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleSenhaVisivel(credencial.id)}
                            >
                              {senhasVisiveis[credencial.id] ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {credencial.secret ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono">
                                {senhasVisiveis[`secret-${credencial.id}`] ? credencial.secret : '••••••••'}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleSenhaVisivel(`secret-${credencial.id}`)}
                              >
                                {senhasVisiveis[`secret-${credencial.id}`] ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {credencial.documento_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleDownloadDocumento(
                                credencial.documento_url!,
                                credencial.documento_nome || 'documento',
                                credencial.id
                              )}
                              disabled={downloadingId === credencial.id}
                            >
                              {downloadingId === credencial.id ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3 mr-1" />
                              )}
                              {credencial.documento_nome || 'Baixar'}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(credencial.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(credencial.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Aba: Enviar para Judit */}
          <TabsContent value="enviar" className="mt-4">
            <div className="space-y-6">
              {credenciaisPendentes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma credencial pendente para enviar.
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Selecionar Credencial Pendente</Label>
                    <Select value={selectedCredencialId} onValueChange={handleSelectCredencial}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma credencial..." />
                      </SelectTrigger>
                      <SelectContent>
                        {credenciaisPendentes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.oabs_cadastradas
                              ? `OAB ${c.oabs_cadastradas.oab_numero}/${c.oabs_cadastradas.oab_uf}`
                              : `CPF ${formatCpf(c.cpf)}`}
                            {' - '}
                            {format(new Date(c.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCredencial && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>CPF (Username)</Label>
                          <Input value={formatCpf(selectedCredencial.cpf)} readOnly className="bg-background" />
                        </div>
                        <div className="space-y-2">
                          <Label>Senha</Label>
                          <Input value={selectedCredencial.senha} readOnly className="bg-background" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Customer Key (OAB) *</Label>
                        <Input
                          value={customerKey}
                          onChange={(e) => setCustomerKey(e.target.value)}
                          placeholder="123456/SP"
                        />
                        <p className="text-xs text-muted-foreground">
                          Formato padrão: NUMERO_OAB/UF (ex: 123456/SP). Pode ser editado conforme necessário.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Secret (Token 2FA)*</Label>
                        <Input
                          type="password"
                          placeholder="Digite o token 2FA do advogado..."
                          value={secret}
                          onChange={(e) => setSecret(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Token de autenticação de dois fatores fornecido pelo advogado
                        </p>
                      </div>

                      <Button
                        className="w-full"
                        onClick={handleEnviarParaJudit}
                        disabled={!secret || !customerKey || enviando}
                      >
                        {enviando ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Enviar para Cofre Judit
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Aba: Histórico Judit */}
          <TabsContent value="historico" className="mt-4">
            <ScrollArea className="h-[400px]">
              {credenciaisJudit.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma credencial enviada para a Judit ainda.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Key</TableHead>
                      <TableHead>Username (CPF)</TableHead>
                      <TableHead>System Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Envio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credenciaisJudit.map((credencial) => (
                      <TableRow key={credencial.id}>
                        <TableCell className="font-mono">{credencial.customer_key}</TableCell>
                        <TableCell className="font-mono">{formatCpf(credencial.username)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{credencial.system_name}</Badge>
                        </TableCell>
                        <TableCell>
                          {credencial.status === 'active' ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Erro
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(credencial.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
