import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Key, Eye, EyeOff, FileText, Send, Loader2, Download, AlertCircle, CheckCircle, Scale, Trash2 } from 'lucide-react';
import { useTenantCredenciais } from '@/hooks/useTenantCredenciais';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TRIBUNAIS_CREDENCIAIS, getTribunaisPorCategoria, getTribunalByValue } from '@/constants/tribunaisCredenciais';

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
  const { credenciaisCliente, credenciaisJudit, isLoading, enviarParaJudit, enviarDiretoParaJudit, deletarCredencialJudit } = useTenantCredenciais(tenantId);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [senhasVisiveis, setSenhasVisiveis] = useState<Record<string, boolean>>({});
  const [selectedCredencialId, setSelectedCredencialId] = useState<string>('');
  const [secret, setSecret] = useState('');
  const [customerKey, setCustomerKey] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Estado para tribunal selecionado (aba Enviar Pendente)
  const [systemName, setSystemName] = useState('');
  
  // Estados para envio direto
  const [diretoCpf, setDiretoCpf] = useState('');
  const [diretoSenha, setDiretoSenha] = useState('');
  const [diretoSecret, setDiretoSecret] = useState('');
  const [diretoCustomerKey, setDiretoCustomerKey] = useState('');
  const [diretoSystemName, setDiretoSystemName] = useState('');
  const [enviandoDireto, setEnviandoDireto] = useState(false);

  // Estados para edição de credenciais pendentes
  const [editCpf, setEditCpf] = useState('');
  const [editSenha, setEditSenha] = useState('');

  // Agrupar tribunais por categoria
  const tribunaisPorCategoria = useMemo(() => getTribunaisPorCategoria(), []);

  const toggleSenhaVisivel = (id: string) => {
    setSenhasVisiveis((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const credenciaisPendentes = credenciaisCliente.filter((c) => c.status === 'pendente');
  const selectedCredencial = credenciaisCliente.find((c) => c.id === selectedCredencialId);

  // Atualizar customerKey e campos editáveis quando selecionar credencial
  const handleSelectCredencial = (id: string) => {
    setSelectedCredencialId(id);
    const cred = credenciaisCliente.find((c) => c.id === id);
    if (cred) {
      setEditCpf(cred.cpf);
      setEditSenha(cred.senha);
      const defaultKey = cred.oabs_cadastradas
        ? `${cred.oabs_cadastradas.oab_numero}/${cred.oabs_cadastradas.oab_uf}`
        : cred.cpf;
      setCustomerKey(defaultKey);
    }
  };

  const handleEnviarParaJudit = async () => {
    if (!selectedCredencial || !customerKey || !systemName) {
      toast.error('Selecione o tribunal/sistema');
      return;
    }

    setEnviando(true);
    try {
      await enviarParaJudit.mutateAsync({
        credencialId: selectedCredencial.id,
        cpf: editCpf,
        senha: editSenha,
        secret,
        customerKey,
        systemName,
        oabId: selectedCredencial.oab_id || undefined,
      });

      setSelectedCredencialId('');
      setEditCpf('');
      setEditSenha('');
      setSecret('');
      setCustomerKey('');
      setSystemName('');
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviarDireto = async () => {
    if (!diretoCpf || !diretoSenha || !diretoCustomerKey || !diretoSecret || !diretoSystemName) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setEnviandoDireto(true);
    try {
      await enviarDiretoParaJudit.mutateAsync({
        cpf: diretoCpf,
        senha: diretoSenha,
        secret: diretoSecret,
        customerKey: diretoCustomerKey,
        systemName: diretoSystemName,
      });

      // Limpar formulário após sucesso
      setDiretoCpf('');
      setDiretoSenha('');
      setDiretoSecret('');
      setDiretoCustomerKey('');
      setDiretoSystemName('');
    } finally {
      setEnviandoDireto(false);
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Credenciais - {tenantName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="recebidas" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="recebidas">
              Recebidas
              {credenciaisPendentes.length > 0 && (
                <Badge variant="secondary" className="ml-2">{credenciaisPendentes.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="enviar">Enviar Pendente</TabsTrigger>
            <TabsTrigger value="direto">Envio Direto</TabsTrigger>
            <TabsTrigger value="deletar">Deletar</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
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
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">OAB</TableHead>
                      <TableHead className="w-[130px]">CPF</TableHead>
                      <TableHead className="w-[150px]">Tribunal</TableHead>
                      <TableHead className="w-[120px]">Senha</TableHead>
                      <TableHead className="w-[120px]">Secret</TableHead>
                      <TableHead className="w-[80px]">Doc</TableHead>
                      <TableHead className="w-[90px]">Status</TableHead>
                      <TableHead className="w-[70px]">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credenciaisCliente.map((credencial) => (
                      <TableRow key={credencial.id}>
                        <TableCell className="w-[120px]">
                          {credencial.oabs_cadastradas ? (
                            <div className="truncate">
                              <div className="font-medium text-sm truncate">
                                {credencial.oabs_cadastradas.oab_numero}/{credencial.oabs_cadastradas.oab_uf}
                              </div>
                              {credencial.oabs_cadastradas.nome_advogado && (
                                <div className="text-xs text-muted-foreground truncate" title={credencial.oabs_cadastradas.nome_advogado}>
                                  {credencial.oabs_cadastradas.nome_advogado}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{formatCpf(credencial.cpf)}</TableCell>
                        <TableCell>
                          {credencial.system_name ? (
                            <Badge variant="outline" className="text-xs truncate max-w-[140px]" title={credencial.system_name}>
                              {credencial.system_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs truncate max-w-[80px]">
                              {senhasVisiveis[credencial.id] ? credencial.senha : '••••••'}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 flex-shrink-0"
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
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs truncate max-w-[80px]">
                                {senhasVisiveis[`secret-${credencial.id}`] ? credencial.secret : '••••••'}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 flex-shrink-0"
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
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="w-[100px]">
                          {credencial.documento_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 max-w-full"
                              onClick={() => handleDownloadDocumento(
                                credencial.documento_url!,
                                credencial.documento_nome || 'documento',
                                credencial.id
                              )}
                              disabled={downloadingId === credencial.id}
                            >
                              {downloadingId === credencial.id ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin flex-shrink-0" />
                              ) : (
                                <Download className="w-3 h-3 mr-1 flex-shrink-0" />
                              )}
                              <span className="truncate max-w-[50px] text-xs" title={credencial.documento_nome || 'Baixar'}>
                                {credencial.documento_nome || 'Baixar'}
                              </span>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(credencial.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(credencial.created_at), 'dd/MM/yy', { locale: ptBR })}
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
                          <Input 
                            value={editCpf} 
                            onChange={(e) => setEditCpf(e.target.value)}
                            placeholder="000.000.000-00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Senha</Label>
                          <div className="flex gap-2">
                            <Input 
                              type={senhasVisiveis['edit-senha'] ? 'text' : 'password'}
                              value={editSenha} 
                              onChange={(e) => setEditSenha(e.target.value)}
                              placeholder="Senha do sistema"
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => toggleSenhaVisivel('edit-senha')}
                            >
                              {senhasVisiveis['edit-senha'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Você pode editar se a senha estiver incorreta
                          </p>
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

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Scale className="w-4 h-4" />
                          Tribunal/Sistema *
                        </Label>
                        <Select value={systemName} onValueChange={setSystemName}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tribunal..." />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-[300px]">
                              {Array.from(tribunaisPorCategoria.entries()).map(([categoria, tribunais]) => (
                                <SelectGroup key={categoria}>
                                  <SelectLabel className="text-xs font-semibold text-muted-foreground">{categoria}</SelectLabel>
                                  {tribunais.map((tribunal) => (
                                    <SelectItem key={tribunal.value} value={tribunal.value}>
                                      {tribunal.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Sistema onde a credencial será cadastrada no cofre Judit
                        </p>
                      </div>

                      <Button
                        className="w-full"
                        onClick={handleEnviarParaJudit}
                        disabled={!secret || !customerKey || !systemName || enviando}
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

          {/* Aba: Envio Direto */}
          <TabsContent value="direto" className="mt-4">
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-4">
                Use esta aba para enviar credenciais diretamente ao cofre Judit sem precisar de uma credencial cadastrada pelo cliente.
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CPF *</Label>
                  <Input
                    value={diretoCpf}
                    onChange={(e) => setDiretoCpf(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <div className="flex gap-2">
                    <Input
                      type={senhasVisiveis['direto-senha'] ? 'text' : 'password'}
                      value={diretoSenha}
                      onChange={(e) => setDiretoSenha(e.target.value)}
                      placeholder="Senha do sistema"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => toggleSenhaVisivel('direto-senha')}
                    >
                      {senhasVisiveis['direto-senha'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Customer Key (OAB) *</Label>
                <Input
                  value={diretoCustomerKey}
                  onChange={(e) => setDiretoCustomerKey(e.target.value)}
                  placeholder="123456/SP"
                />
                <p className="text-xs text-muted-foreground">
                  Formato padrão: NUMERO_OAB/UF (ex: 123456/SP)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Secret (Token 2FA) *</Label>
                <div className="flex gap-2">
                  <Input
                    type={senhasVisiveis['direto-secret'] ? 'text' : 'password'}
                    value={diretoSecret}
                    onChange={(e) => setDiretoSecret(e.target.value)}
                    placeholder="Token de autenticação 2FA"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => toggleSenhaVisivel('direto-secret')}
                  >
                    {senhasVisiveis['direto-secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Tribunal/Sistema *
                </Label>
                <Select value={diretoSystemName} onValueChange={setDiretoSystemName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tribunal..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[300px]">
                      {Array.from(tribunaisPorCategoria.entries()).map(([categoria, tribunais]) => (
                        <SelectGroup key={categoria}>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground">{categoria}</SelectLabel>
                          {tribunais.map((tribunal) => (
                            <SelectItem key={tribunal.value} value={tribunal.value}>
                              {tribunal.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sistema onde a credencial será cadastrada no cofre Judit
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleEnviarDireto}
                disabled={!diretoCpf || !diretoSenha || !diretoSecret || !diretoCustomerKey || !diretoSystemName || enviandoDireto}
              >
                {enviandoDireto ? (
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
          </TabsContent>

          {/* Aba: Deletar Credenciais do Judit */}
          <TabsContent value="deletar" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Selecione uma credencial para remover do cofre Judit. 
                Esta ação não pode ser desfeita.
              </div>
              
              <ScrollArea className="h-[400px]">
                {credenciaisJudit.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhuma credencial no cofre Judit.
                  </div>
                ) : (
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Customer Key</TableHead>
                        <TableHead className="w-[180px]">Sistema</TableHead>
                        <TableHead className="w-[130px]">CPF</TableHead>
                        <TableHead className="w-[80px]">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {credenciaisJudit.map((cred) => (
                        <TableRow key={cred.id}>
                          <TableCell className="font-mono text-xs truncate" title={cred.customer_key}>
                            {cred.customer_key}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs" title={cred.system_name}>
                              {getTribunalByValue(cred.system_name)?.label || cred.system_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs whitespace-nowrap">
                            {formatCpf(cred.username)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                if (!confirm(`Remover credencial ${cred.customer_key} do sistema ${cred.system_name}?`)) {
                                  return;
                                }
                                setDeletandoId(cred.id);
                                try {
                                  await deletarCredencialJudit.mutateAsync({
                                    credencialJuditId: cred.id,
                                    systemName: cred.system_name,
                                    customerKey: cred.customer_key,
                                  });
                                } finally {
                                  setDeletandoId(null);
                                }
                              }}
                              disabled={deletandoId === cred.id}
                            >
                              {deletandoId === cred.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
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
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Customer Key</TableHead>
                      <TableHead className="w-[150px]">Username (CPF)</TableHead>
                      <TableHead className="w-[120px]">System Name</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[100px]">Data Envio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credenciaisJudit.map((credencial) => (
                      <TableRow key={credencial.id}>
                        <TableCell className="font-mono text-xs truncate" title={credencial.customer_key}>{credencial.customer_key}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{formatCpf(credencial.username)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs" title={credencial.system_name}>
                            {getTribunalByValue(credencial.system_name)?.label || credencial.system_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {credencial.status === 'active' ? (
                            <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Erro
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(credencial.created_at), 'dd/MM/yy', { locale: ptBR })}
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
