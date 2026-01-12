import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSubscription, TenantAssinaturaPerfil } from '@/hooks/useSubscription';
import { useCredenciaisCliente } from '@/hooks/useCredenciaisCliente';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  User, 
  FileText, 
  Download, 
  Loader2, 
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Key,
  Upload
} from 'lucide-react';

interface SubscriptionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PerfilFormData {
  nome_responsavel: string;
  cpf: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
}

export function SubscriptionDrawer({ open, onOpenChange }: SubscriptionDrawerProps) {
  const { perfil, boletos, planoInfo, loading, salvarPerfil, aceitarTermos } = useSubscription();
  const { credenciais, oabs, isLoading: loadingCredenciais, uploading, createCredencial } = useCredenciaisCliente();
  const [saving, setSaving] = useState(false);
  const [termosChecked, setTermosChecked] = useState(false);
  const [formData, setFormData] = useState<PerfilFormData>({
    nome_responsavel: '',
    cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: ''
  });

  // Form de credenciais
  const [credencialForm, setCredencialForm] = useState({
    oab_id: '',
    cpf: '',
    senha: '',
  });
  const [documento, setDocumento] = useState<File | null>(null);

  useEffect(() => {
    if (perfil) {
      setFormData({
        nome_responsavel: perfil.nome_responsavel || '',
        cpf: perfil.cpf || '',
        email: perfil.email || '',
        telefone: perfil.telefone || '',
        endereco: perfil.endereco || '',
        cidade: perfil.cidade || '',
        estado: perfil.estado || '',
        cep: perfil.cep || ''
      });
      setTermosChecked(perfil.termos_aceitos || false);
    }
  }, [perfil]);

  const handleInputChange = (field: keyof PerfilFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePerfil = async () => {
    if (!formData.nome_responsavel || !formData.cpf || !formData.email) {
      return;
    }
    
    setSaving(true);
    try {
      await salvarPerfil(formData);
    } finally {
      setSaving(false);
    }
  };

  const handleAceitarTermos = async () => {
    setSaving(true);
    try {
      const success = await aceitarTermos();
      if (success) {
        setTermosChecked(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarCredencial = async () => {
    if (!credencialForm.oab_id || !credencialForm.cpf || !credencialForm.senha) {
      return;
    }

    try {
      await createCredencial.mutateAsync({
        oab_id: credencialForm.oab_id,
        cpf: credencialForm.cpf,
        senha: credencialForm.senha,
        documento: documento || undefined,
      });
      
      // Limpar formulário
      setCredencialForm({ oab_id: '', cpf: '', senha: '' });
      setDocumento(null);
    } catch (error) {
      console.error('Erro ao enviar credencial:', error);
    }
  };

  const getCredencialStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'enviado':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Enviado</Badge>;
      case 'erro':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Pago
          </Badge>
        );
      case 'vencido':
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Vencido
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle className="flex items-center gap-2">
            Minha Assinatura
          </DrawerTitle>
          {planoInfo && (
            <DrawerDescription>
              Plano: <span className="font-medium text-foreground">{planoInfo.nome}</span>
              {planoInfo.valor_mensal > 0 && (
                <span className="ml-2">• {formatCurrency(planoInfo.valor_mensal)}/mês</span>
              )}
            </DrawerDescription>
          )}
        </DrawerHeader>

        <Tabs defaultValue="perfil" className="flex-1">
          <TabsList className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="perfil" className="gap-2">
              <User className="w-4 h-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="vencimentos" className="gap-2">
              <FileText className="w-4 h-4" />
              Vencimentos
              {boletos.filter(b => b.status === 'pendente').length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {boletos.filter(b => b.status === 'pendente').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="credenciais" className="gap-2">
              <Key className="w-4 h-4" />
              Credenciais
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[50vh]">
            <TabsContent value="perfil" className="p-4 m-0">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="nome">Nome do Responsável *</Label>
                      <Input
                        id="nome"
                        value={formData.nome_responsavel}
                        onChange={(e) => handleInputChange('nome_responsavel', e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => handleInputChange('cpf', e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => handleInputChange('telefone', e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        value={formData.cep}
                        onChange={(e) => handleInputChange('cep', e.target.value)}
                        placeholder="00000-000"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Input
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => handleInputChange('endereco', e.target.value)}
                        placeholder="Rua, número, complemento"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        value={formData.cidade}
                        onChange={(e) => handleInputChange('cidade', e.target.value)}
                        placeholder="Cidade"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="estado">Estado</Label>
                      <Input
                        id="estado"
                        value={formData.estado}
                        onChange={(e) => handleInputChange('estado', e.target.value)}
                        placeholder="UF"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button 
                      onClick={handleSavePerfil} 
                      disabled={saving || !formData.nome_responsavel || !formData.cpf || !formData.email}
                      className="w-full"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Salvar Perfil
                    </Button>
                  </div>

                  {/* Termos de Uso */}
                  <div className="pt-4 border-t space-y-3">
                    <h4 className="font-medium text-sm">Termos de Uso e Licença</h4>
                    
                    {perfil?.termos_aceitos ? (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 p-3 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          Termos aceitos em{' '}
                          {perfil.termos_aceitos_em && 
                            format(new Date(perfil.termos_aceitos_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          }
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id="termos"
                            checked={termosChecked}
                            onCheckedChange={(checked) => setTermosChecked(checked === true)}
                            disabled={!perfil}
                          />
                          <label 
                            htmlFor="termos" 
                            className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                          >
                            Li e aceito os{' '}
                            <a 
                              href="/docs/termos-de-uso.pdf?v=20260112-3"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Termos de Uso e Licença
                            </a>{' '}
                            e a{' '}
                            <a 
                              href="/docs/politica-de-privacidade.pdf?v=20260112-2"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Política de Privacidade
                            </a>{' '}
                            do sistema.
                          </label>
                        </div>
                        
                        <Button
                          variant="outline"
                          onClick={handleAceitarTermos}
                          disabled={saving || !termosChecked || !perfil}
                          className="w-full"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                          )}
                          Confirmar Aceite dos Termos
                        </Button>
                        
                        {!perfil && (
                          <p className="text-xs text-muted-foreground">
                            Salve o perfil primeiro para poder aceitar os termos.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="vencimentos" className="p-4 m-0">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : boletos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum boleto disponível</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {boletos.map((boleto) => (
                    <div 
                      key={boleto.id}
                      className="p-4 rounded-lg border bg-card hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{boleto.mes_referencia}</span>
                            {getStatusBadge(boleto.status)}
                          </div>
                          <div className="text-lg font-semibold text-primary">
                            {formatCurrency(boleto.valor)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Vencimento: {format(new Date(boleto.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                          {boleto.observacao && (
                            <div className="text-xs text-muted-foreground mt-2">
                              {boleto.observacao}
                            </div>
                          )}
                        </div>
                        
                        {boleto.url_boleto && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(boleto.url_boleto!, '_blank')}
                            className="gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Baixar
                          </Button>
                        )}
                      </div>
                      
                      {boleto.codigo_barras && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Código de barras:</p>
                          <code className="text-xs bg-muted p-2 rounded block break-all">
                            {boleto.codigo_barras}
                          </code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Aba Credenciais */}
            <TabsContent value="credenciais" className="p-4 m-0">
              {loadingCredenciais ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Formulário de nova credencial */}
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium text-sm">Cadastrar Nova Credencial</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cred-oab">OAB *</Label>
                      <Select 
                        value={credencialForm.oab_id} 
                        onValueChange={(val) => setCredencialForm(prev => ({ ...prev, oab_id: val }))}
                      >
                        <SelectTrigger id="cred-oab">
                          <SelectValue placeholder="Selecione uma OAB..." />
                        </SelectTrigger>
                        <SelectContent>
                          {oabs.map((oab) => (
                            <SelectItem key={oab.id} value={oab.id}>
                              {oab.oab_numero}/{oab.oab_uf}
                              {oab.nome_advogado && ` - ${oab.nome_advogado}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cred-cpf">CPF *</Label>
                      <Input
                        id="cred-cpf"
                        value={credencialForm.cpf}
                        onChange={(e) => setCredencialForm(prev => ({ ...prev, cpf: e.target.value }))}
                        placeholder="000.000.000-00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cred-senha">Senha *</Label>
                      <Input
                        id="cred-senha"
                        type="password"
                        value={credencialForm.senha}
                        onChange={(e) => setCredencialForm(prev => ({ ...prev, senha: e.target.value }))}
                        placeholder="Senha do sistema"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cred-doc">Documento (Certificado PDF)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="cred-doc"
                          type="file"
                          accept=".pdf,.pfx,.p12"
                          onChange={(e) => setDocumento(e.target.files?.[0] || null)}
                          className="flex-1"
                        />
                        {documento && (
                          <Badge variant="secondary" className="text-xs">
                            {documento.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Envie o certificado digital ou outro documento necessário
                      </p>
                    </div>

                    <Button
                      onClick={handleEnviarCredencial}
                      disabled={!credencialForm.oab_id || !credencialForm.cpf || !credencialForm.senha || createCredencial.isPending || uploading}
                      className="w-full"
                    >
                      {(createCredencial.isPending || uploading) ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Enviar Credencial
                    </Button>
                  </div>

                  {/* Lista de credenciais enviadas */}
                  {credenciais.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Credenciais Enviadas</h4>
                      {credenciais.map((cred) => (
                        <div 
                          key={cred.id}
                          className="p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">
                                  {cred.oabs_cadastradas 
                                    ? `OAB ${cred.oabs_cadastradas.oab_numero}/${cred.oabs_cadastradas.oab_uf}`
                                    : `CPF ${cred.cpf}`}
                                </span>
                                {getCredencialStatusBadge(cred.status)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Enviado em {format(new Date(cred.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </div>
                              {cred.erro_mensagem && (
                                <div className="text-sm text-destructive mt-1">
                                  {cred.erro_mensagem}
                                </div>
                              )}
                            </div>
                            {cred.documento_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(cred.documento_url!, '_blank')}
                                className="gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Doc
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {credenciais.length === 0 && oabs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma OAB cadastrada.</p>
                      <p className="text-sm">Cadastre uma OAB primeiro para enviar credenciais.</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DrawerFooter className="border-t pt-4">
          <DrawerClose asChild>
            <Button variant="outline">Fechar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
