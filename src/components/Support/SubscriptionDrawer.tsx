import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { useSubscription, TenantAssinaturaPerfil, TenantBoleto } from '@/hooks/useSubscription';
import { useCredenciaisCliente } from '@/hooks/useCredenciaisCliente';
import { TRIBUNAIS_CREDENCIAIS, getTribunalByValue } from '@/constants/tribunaisCredenciais';
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  FileText, 
  Download,
  Loader2, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Key,
  Upload,
  Plus,
  Trash2,
  AlertTriangle,
  Building2,
  Eye,
  EyeOff,
  Calendar
} from 'lucide-react';
import { PlanoIndicator } from '@/components/Common/PlanoIndicator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BoletoPaymentDialog } from './BoletoPaymentDialog';

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
  const { perfil, boletos, planoInfo, loading, salvarPerfil, aceitarTermos, downloadBoleto } = useSubscription();
  const { credenciais, isLoading: loadingCredenciais, uploading, createCredencial, deleteCredencial } = useCredenciaisCliente();
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

  // Estado para dialog de pagamento
  const [selectedBoleto, setSelectedBoleto] = useState<TenantBoleto | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Form de credenciais
  const [showCredencialForm, setShowCredencialForm] = useState(false);
  const [credencialForm, setCredencialForm] = useState({
    oab_numero: '',
    oab_uf: '',
    cpf: '',
    senha: '',
    secret: '',
    system_name: '',
  });
  const [documento, setDocumento] = useState<File | null>(null);

  // Estado para exclusão com dupla confirmação
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);

  // Estados para visibilidade de senha/secret no formulário
  const [showSenha, setShowSenha] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Agrupar tribunais por categoria
  const tribunaisPorCategoria = useMemo(() => {
    const grouped = new Map<string, typeof TRIBUNAIS_CREDENCIAIS>();
    
    TRIBUNAIS_CREDENCIAIS.forEach(tribunal => {
      const existing = grouped.get(tribunal.category) || [];
      existing.push(tribunal);
      grouped.set(tribunal.category, existing);
    });
    
    return grouped;
  }, []);

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
    if (!credencialForm.oab_numero || !credencialForm.oab_uf || !credencialForm.cpf || !credencialForm.senha || !credencialForm.system_name) {
      return;
    }

    try {
      await createCredencial.mutateAsync({
        oab_numero: credencialForm.oab_numero.trim(),
        oab_uf: credencialForm.oab_uf.trim().toUpperCase(),
        cpf: credencialForm.cpf,
        senha: credencialForm.senha,
        secret: credencialForm.secret || undefined,
        documento: documento || undefined,
        system_name: credencialForm.system_name,
      });
      
      // Limpar formulário e fechar
      setCredencialForm({ oab_numero: '', oab_uf: '', cpf: '', senha: '', secret: '', system_name: '' });
      setDocumento(null);
      setShowCredencialForm(false);
    } catch (error) {
      console.error('Erro ao enviar credencial:', error);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmStep(1);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      await deleteCredencial.mutateAsync(deleteConfirmId);
    } finally {
      setDeleteConfirmId(null);
      setDeleteConfirmStep(1);
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
            {planoInfo && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="cursor-pointer hover:opacity-80 transition-opacity">
                    <PlanoIndicator plano={planoInfo.plano} size="md" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="start">
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm">
                      TROCA DE PLANO:
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Quer trocar de plano? Downgrade ou Upgrade?
                      <br />
                      Abra um Ticket e fale com nosso suporte.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </DrawerTitle>
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
                          {boleto.observacao && (
                            <div className="text-xs text-muted-foreground mt-2">
                              {boleto.observacao}
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBoleto(boleto);
                            setPaymentDialogOpen(true);
                          }}
                          className="gap-2"
                        >
                          <Calendar className="w-4 h-4" />
                          Venc. {format(parseLocalDate(boleto.data_vencimento), "dd/MM", { locale: ptBR })}
                        </Button>
                      </div>
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
                  {/* Header com botão Adicionar */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Minhas Credenciais</h4>
                    {!showCredencialForm && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowCredencialForm(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Nova Credencial
                      </Button>
                    )}
                  </div>

                  {/* Formulário de nova credencial (colapsável) */}
                  {showCredencialForm && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Nova Credencial</h4>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setShowCredencialForm(false);
                            setCredencialForm({ oab_numero: '', oab_uf: '', cpf: '', senha: '', secret: '', system_name: '' });
                            setDocumento(null);
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>

                      {/* Seletor de Tribunal */}
                      <div className="space-y-2">
                        <Label htmlFor="cred-tribunal">Tribunal/Sistema *</Label>
                        <Select
                          value={credencialForm.system_name}
                          onValueChange={(value) => setCredencialForm(prev => ({ ...prev, system_name: value }))}
                        >
                          <SelectTrigger id="cred-tribunal" className="w-full">
                            <SelectValue placeholder="Selecione o tribunal..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {Array.from(tribunaisPorCategoria.entries()).map(([category, tribunais]) => (
                              <SelectGroup key={category}>
                                <SelectLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Building2 className="w-3 h-3" />
                                  {category}
                                </SelectLabel>
                                {tribunais.map((tribunal) => (
                                  <SelectItem key={tribunal.value} value={tribunal.value}>
                                    {tribunal.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Selecione o tribunal onde esta credencial será usada
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-3 space-y-2">
                          <Label htmlFor="cred-oab-numero">Número OAB *</Label>
                          <Input
                            id="cred-oab-numero"
                            value={credencialForm.oab_numero}
                            onChange={(e) => setCredencialForm(prev => ({ ...prev, oab_numero: e.target.value }))}
                            placeholder="123456"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cred-oab-uf">UF *</Label>
                          <Input
                            id="cred-oab-uf"
                            value={credencialForm.oab_uf}
                            onChange={(e) => setCredencialForm(prev => ({ ...prev, oab_uf: e.target.value.toUpperCase() }))}
                            placeholder="SP"
                            maxLength={2}
                          />
                        </div>
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
                        <div className="flex gap-2">
                          <Input
                            id="cred-senha"
                            type={showSenha ? "text" : "password"}
                            value={credencialForm.senha}
                            onChange={(e) => setCredencialForm(prev => ({ ...prev, senha: e.target.value }))}
                            placeholder="Senha do sistema"
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => setShowSenha(!showSenha)}
                          >
                            {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cred-secret">Secret (opcional)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="cred-secret"
                            type={showSecret ? "text" : "password"}
                            value={credencialForm.secret}
                            onChange={(e) => setCredencialForm(prev => ({ ...prev, secret: e.target.value }))}
                            placeholder="Token 2FA (se aplicável)"
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                          >
                            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Token de autenticação de dois fatores, se você possuir
                        </p>
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
                        disabled={!credencialForm.oab_numero || !credencialForm.oab_uf || !credencialForm.cpf || !credencialForm.senha || !credencialForm.system_name || createCredencial.isPending || uploading}
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
                  )}

                  {/* Lista de credenciais enviadas */}
                  {credenciais.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground">Credenciais Enviadas</h4>
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
                              {cred.system_name && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                                  <Building2 className="w-3.5 h-3.5" />
                                  <span>{getTribunalByValue(cred.system_name)?.label || cred.system_name}</span>
                                </div>
                              )}
                              <div className="text-sm text-muted-foreground">
                                Enviado em {format(new Date(cred.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </div>
                              {cred.erro_mensagem && (
                                <div className="text-sm text-destructive mt-1">
                                  {cred.erro_mensagem}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
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
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteClick(cred.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {credenciais.length === 0 && !showCredencialForm && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma credencial cadastrada.</p>
                      <p className="text-sm">Clique em "Adicionar Nova Credencial" para começar.</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* AlertDialog para exclusão com dupla confirmação */}
            <AlertDialog open={!!deleteConfirmId} onOpenChange={() => { setDeleteConfirmId(null); setDeleteConfirmStep(1); }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    {deleteConfirmStep === 1 ? 'Atenção!' : 'Confirmar Exclusão'}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    {deleteConfirmStep === 1 ? (
                      <>
                        <p className="font-medium text-foreground">
                          Apagar esta credencial afetará o funcionamento da Controladoria sobre a OAB vinculada.
                        </p>
                        <p>
                          Os processos dessa OAB não poderão mais ser atualizados automaticamente pelo sistema.
                          Deseja continuar?
                        </p>
                      </>
                    ) : (
                      <p>
                        Esta ação não pode ser desfeita. Tem certeza que deseja remover permanentemente esta credencial?
                      </p>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => { setDeleteConfirmId(null); setDeleteConfirmStep(1); }}>
                    Cancelar
                  </AlertDialogCancel>
                  {deleteConfirmStep === 1 ? (
                    <Button variant="destructive" onClick={() => setDeleteConfirmStep(2)}>
                      Sim, continuar
                    </Button>
                  ) : (
                    <Button 
                      variant="destructive" 
                      onClick={handleConfirmDelete}
                      disabled={deleteCredencial.isPending}
                    >
                      {deleteCredencial.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Confirmar Exclusão
                    </Button>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </ScrollArea>
        </Tabs>

        <DrawerFooter className="border-t pt-4">
          <DrawerClose asChild>
            <Button variant="outline">Fechar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>

      {/* Dialog de Pagamento */}
      <BoletoPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        boleto={selectedBoleto}
        onDownloadBoleto={downloadBoleto}
      />
    </Drawer>
  );
}
