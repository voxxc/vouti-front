import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { useSubscription, TenantBoleto } from '@/hooks/useSubscription';
import { useCredenciaisCliente } from '@/hooks/useCredenciaisCliente';
import { TRIBUNAIS_CREDENCIAIS, getTribunalByValue } from '@/constants/tribunaisCredenciais';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Calendar,
} from 'lucide-react';
import { PlanoIndicator } from '@/components/Common/PlanoIndicator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BoletoPaymentDialog } from './BoletoPaymentDialog';

interface SubscriptionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: string;
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

export function SubscriptionDrawer({ open, onOpenChange, initialTab = 'perfil' }: SubscriptionDrawerProps) {
  const { perfil, boletos, planoInfo, loading, salvarPerfil, aceitarTermos, downloadBoleto } = useSubscription();
  const { credenciais, isLoading: loadingCredenciais, uploading, createCredencial, deleteCredencial } = useCredenciaisCliente();
  const [saving, setSaving] = useState(false);
  const [termosChecked, setTermosChecked] = useState(false);
  const [formData, setFormData] = useState<PerfilFormData>({
    nome_responsavel: '', cpf: '', email: '', telefone: '',
    endereco: '', cidade: '', estado: '', cep: '',
  });

  const [selectedBoleto, setSelectedBoleto] = useState<TenantBoleto | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const [showCredencialForm, setShowCredencialForm] = useState(false);
  const [credencialForm, setCredencialForm] = useState({
    oab_numero: '', oab_uf: '', cpf: '', senha: '', secret: '', system_name: '',
  });
  const [documento, setDocumento] = useState<File | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);

  const [showSenha, setShowSenha] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const tribunaisPorCategoria = useMemo(() => {
    const grouped = new Map<string, typeof TRIBUNAIS_CREDENCIAIS>();
    TRIBUNAIS_CREDENCIAIS.forEach((t) => {
      const e = grouped.get(t.category) || [];
      e.push(t);
      grouped.set(t.category, e);
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
        cep: perfil.cep || '',
      });
      setTermosChecked(perfil.termos_aceitos || false);
    }
  }, [perfil]);

  const handleInputChange = (field: keyof PerfilFormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSavePerfil = async () => {
    if (!formData.nome_responsavel || !formData.cpf || !formData.email) return;
    setSaving(true);
    try { await salvarPerfil(formData); } finally { setSaving(false); }
  };

  const handleAceitarTermos = async () => {
    setSaving(true);
    try {
      const ok = await aceitarTermos();
      if (ok) setTermosChecked(true);
    } finally { setSaving(false); }
  };

  const handleEnviarCredencial = async () => {
    if (!credencialForm.oab_numero || !credencialForm.oab_uf || !credencialForm.cpf || !credencialForm.senha || !credencialForm.system_name) return;
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
      setCredencialForm({ oab_numero: '', oab_uf: '', cpf: '', senha: '', secret: '', system_name: '' });
      setDocumento(null);
      setShowCredencialForm(false);
    } catch (e) {
      console.error('Erro ao enviar credencial:', e);
    }
  };

  const handleDeleteClick = (id: string) => { setDeleteConfirmId(id); setDeleteConfirmStep(1); };
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try { await deleteCredencial.mutateAsync(deleteConfirmId); }
    finally { setDeleteConfirmId(null); setDeleteConfirmStep(1); }
  };

  const getCredencialStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente': return <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-yellow-600 border-yellow-600/50"><Clock className="w-2.5 h-2.5 mr-1" />Pendente</Badge>;
      case 'enviado': return <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-green-600 border-green-600/50"><CheckCircle2 className="w-2.5 h-2.5 mr-1" />Enviado</Badge>;
      case 'erro': return <Badge variant="destructive" className="h-5 px-1.5 text-[10px]"><AlertCircle className="w-2.5 h-2.5 mr-1" />Erro</Badge>;
      default: return <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{status}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago': return <Badge className="h-5 px-1.5 text-[10px] bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10"><CheckCircle2 className="w-2.5 h-2.5 mr-1" />Pago</Badge>;
      case 'vencido': return <Badge className="h-5 px-1.5 text-[10px] bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/10"><AlertCircle className="w-2.5 h-2.5 mr-1" />Vencido</Badge>;
      default: return <Badge className="h-5 px-1.5 text-[10px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/10"><Clock className="w-2.5 h-2.5 mr-1" />Pendente</Badge>;
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const fieldLabel = "text-[11px] font-medium text-muted-foreground uppercase tracking-wide";
  const inputCls = "h-9 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[95vw] p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            Minha Assinatura
            {planoInfo && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="cursor-pointer hover:opacity-80 transition-opacity">
                    <PlanoIndicator plano={planoInfo.plano} size="sm" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <h4 className="font-semibold text-xs mb-1">TROCA DE PLANO</h4>
                  <p className="text-xs text-muted-foreground">
                    Quer trocar de plano? Abra um Ticket e fale com nosso suporte.
                  </p>
                </PopoverContent>
              </Popover>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={initialTab} key={initialTab} className="flex flex-col">
          <div className="px-5">
            <TabsList className="h-9 bg-muted/50 p-0.5 rounded-lg w-full grid grid-cols-3">
              <TabsTrigger value="perfil" className="text-xs gap-1.5 h-8 data-[state=active]:bg-background">
                <User className="w-3.5 h-3.5" /> Perfil
              </TabsTrigger>
              <TabsTrigger value="vencimentos" className="text-xs gap-1.5 h-8 data-[state=active]:bg-background">
                <FileText className="w-3.5 h-3.5" /> Vencimentos
                {boletos.filter((b) => b.status === 'pendente').length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                    {boletos.filter((b) => b.status === 'pendente').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="credenciais" className="text-xs gap-1.5 h-8 data-[state=active]:bg-background">
                <Key className="w-3.5 h-3.5" /> Credenciais
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="max-h-[60vh]">
            {/* PERFIL */}
            <TabsContent value="perfil" className="px-5 py-4 m-0">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome" className={fieldLabel}>Nome do responsável *</Label>
                    <Input id="nome" value={formData.nome_responsavel}
                      onChange={(e) => handleInputChange('nome_responsavel', e.target.value)}
                      placeholder="Nome completo" className={inputCls} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cpf" className={fieldLabel}>CPF *</Label>
                      <Input id="cpf" value={formData.cpf}
                        onChange={(e) => handleInputChange('cpf', e.target.value)}
                        placeholder="000.000.000-00" className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className={fieldLabel}>E-mail *</Label>
                      <Input id="email" type="email" value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="email@exemplo.com" className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="telefone" className={fieldLabel}>Telefone</Label>
                      <Input id="telefone" value={formData.telefone}
                        onChange={(e) => handleInputChange('telefone', e.target.value)}
                        placeholder="(00) 00000-0000" className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cep" className={fieldLabel}>CEP</Label>
                      <Input id="cep" value={formData.cep}
                        onChange={(e) => handleInputChange('cep', e.target.value)}
                        placeholder="00000-000" className={inputCls} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="endereco" className={fieldLabel}>Endereço</Label>
                    <Input id="endereco" value={formData.endereco}
                      onChange={(e) => handleInputChange('endereco', e.target.value)}
                      placeholder="Rua, número, complemento" className={inputCls} />
                  </div>

                  <div className="grid grid-cols-[1fr_80px] gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cidade" className={fieldLabel}>Cidade</Label>
                      <Input id="cidade" value={formData.cidade}
                        onChange={(e) => handleInputChange('cidade', e.target.value)}
                        placeholder="Cidade" className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="estado" className={fieldLabel}>UF</Label>
                      <Input id="estado" value={formData.estado}
                        onChange={(e) => handleInputChange('estado', e.target.value)}
                        placeholder="UF" maxLength={2} className={inputCls} />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
                    <Button size="sm" onClick={handleSavePerfil}
                      disabled={saving || !formData.nome_responsavel || !formData.cpf || !formData.email}>
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                      Salvar
                    </Button>
                  </div>

                  {/* Termos */}
                  <div className="pt-3 mt-1 border-t">
                    {perfil?.termos_aceitos ? (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          Termos aceitos em{' '}
                          {perfil.termos_aceitos_em &&
                            format(new Date(perfil.termos_aceitos_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Checkbox id="termos" checked={termosChecked}
                            onCheckedChange={(c) => setTermosChecked(c === true)}
                            disabled={!perfil} className="mt-0.5" />
                          <label htmlFor="termos" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                            Li e aceito os{' '}
                            <a href="/docs/termos-uso-licenca-vouti.pdf" download className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                              Termos de Uso
                            </a>{' '}e a{' '}
                            <a href="/docs/politica-de-privacidade.pdf" download className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                              Política de Privacidade
                            </a>.
                          </label>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleAceitarTermos}
                          disabled={saving || !termosChecked || !perfil} className="w-full">
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                          Confirmar aceite
                        </Button>
                        {!perfil && (
                          <p className="text-[11px] text-muted-foreground">Salve o perfil primeiro para poder aceitar os termos.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* VENCIMENTOS */}
            <TabsContent value="vencimentos" className="px-5 py-4 m-0">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : boletos.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum boleto disponível</p>
                </div>
              ) : (
                <div className="divide-y rounded-lg border">
                  {boletos.map((boleto) => (
                    <div key={boleto.id} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{boleto.mes_referencia}</span>
                          {getStatusBadge(boleto.status)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-semibold text-foreground">{formatCurrency(boleto.valor)}</span>
                          <span className="text-[11px] text-muted-foreground">
                            · vence {format(parseLocalDate(boleto.data_vencimento), 'dd/MM', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1.5"
                        onClick={() => { setSelectedBoleto(boleto); setPaymentDialogOpen(true); }}>
                        <Calendar className="w-3.5 h-3.5" />
                        Abrir
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* CREDENCIAIS */}
            <TabsContent value="credenciais" className="px-5 py-4 m-0">
              {loadingCredenciais ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Credenciais</h4>
                    {!showCredencialForm && (
                      <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs"
                        onClick={() => setShowCredencialForm(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Nova
                      </Button>
                    )}
                  </div>

                  {showCredencialForm && (
                    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold">Nova credencial</h4>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                          onClick={() => {
                            setShowCredencialForm(false);
                            setCredencialForm({ oab_numero: '', oab_uf: '', cpf: '', senha: '', secret: '', system_name: '' });
                            setDocumento(null);
                          }}>
                          Cancelar
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="cred-tribunal" className={fieldLabel}>Tribunal *</Label>
                        <Select value={credencialForm.system_name}
                          onValueChange={(v) => setCredencialForm((p) => ({ ...p, system_name: v }))}>
                          <SelectTrigger id="cred-tribunal" className="h-9 text-sm">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {Array.from(tribunaisPorCategoria.entries()).map(([category, tribunais]) => (
                              <SelectGroup key={category}>
                                <SelectLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Building2 className="w-3 h-3" /> {category}
                                </SelectLabel>
                                {tribunais.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-[1fr_80px] gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="cred-oab-numero" className={fieldLabel}>OAB nº *</Label>
                          <Input id="cred-oab-numero" value={credencialForm.oab_numero}
                            onChange={(e) => setCredencialForm((p) => ({ ...p, oab_numero: e.target.value }))}
                            placeholder="123456" className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cred-oab-uf" className={fieldLabel}>UF *</Label>
                          <Input id="cred-oab-uf" value={credencialForm.oab_uf}
                            onChange={(e) => setCredencialForm((p) => ({ ...p, oab_uf: e.target.value.toUpperCase() }))}
                            placeholder="SP" maxLength={2} className={inputCls} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="cred-cpf" className={fieldLabel}>CPF *</Label>
                        <Input id="cred-cpf" value={credencialForm.cpf}
                          onChange={(e) => setCredencialForm((p) => ({ ...p, cpf: e.target.value }))}
                          placeholder="000.000.000-00" className={inputCls} />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="cred-senha" className={fieldLabel}>Senha *</Label>
                        <div className="flex gap-2">
                          <Input id="cred-senha" type={showSenha ? 'text' : 'password'}
                            value={credencialForm.senha}
                            onChange={(e) => setCredencialForm((p) => ({ ...p, senha: e.target.value }))}
                            placeholder="Senha do sistema" className={`flex-1 ${inputCls}`} />
                          <Button variant="ghost" size="icon" type="button" className="h-9 w-9"
                            onClick={() => setShowSenha(!showSenha)}>
                            {showSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="cred-secret" className={fieldLabel}>Secret (opcional)</Label>
                        <div className="flex gap-2">
                          <Input id="cred-secret" type={showSecret ? 'text' : 'password'}
                            value={credencialForm.secret}
                            onChange={(e) => setCredencialForm((p) => ({ ...p, secret: e.target.value }))}
                            placeholder="Token 2FA (se aplicável)" className={`flex-1 ${inputCls}`} />
                          <Button variant="ghost" size="icon" type="button" className="h-9 w-9"
                            onClick={() => setShowSecret(!showSecret)}>
                            {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="cred-doc" className={fieldLabel}>Documento (PDF/PFX)</Label>
                        <div className="flex items-center gap-2">
                          <Input id="cred-doc" type="file" accept=".pdf,.pfx,.p12"
                            onChange={(e) => setDocumento(e.target.files?.[0] || null)}
                            className={`flex-1 ${inputCls} file:text-xs`} />
                          {documento && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{documento.name}</Badge>
                          )}
                        </div>
                      </div>

                      <Button size="sm" onClick={handleEnviarCredencial}
                        disabled={!credencialForm.oab_numero || !credencialForm.oab_uf || !credencialForm.cpf || !credencialForm.senha || !credencialForm.system_name || createCredencial.isPending || uploading}
                        className="w-full">
                        {(createCredencial.isPending || uploading)
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                        Enviar credencial
                      </Button>
                    </div>
                  )}

                  {credenciais.length > 0 && (
                    <div className="divide-y rounded-lg border">
                      {credenciais.map((cred) => (
                        <div key={cred.id} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {cred.oabs_cadastradas
                                  ? `OAB ${cred.oabs_cadastradas.oab_numero}/${cred.oabs_cadastradas.oab_uf}`
                                  : `CPF ${cred.cpf}`}
                              </span>
                              {getCredencialStatusBadge(cred.status)}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                              {cred.system_name && (
                                <>
                                  <Building2 className="w-3 h-3" />
                                  <span className="truncate">{getTribunalByValue(cred.system_name)?.label || cred.system_name}</span>
                                  <span>·</span>
                                </>
                              )}
                              <span>{format(new Date(cred.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            </div>
                            {cred.erro_mensagem && (
                              <div className="text-[11px] text-destructive mt-0.5">{cred.erro_mensagem}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {cred.documento_url && (
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => window.open(cred.documento_url!, '_blank')}>
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteClick(cred.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {credenciais.length === 0 && !showCredencialForm && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Key className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Nenhuma credencial cadastrada</p>
                      <p className="text-xs mt-0.5">Clique em "Nova" para começar.</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <AlertDialog open={!!deleteConfirmId} onOpenChange={() => { setDeleteConfirmId(null); setDeleteConfirmStep(1); }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    {deleteConfirmStep === 1 ? 'Atenção!' : 'Confirmar exclusão'}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    {deleteConfirmStep === 1 ? (
                      <>
                        <span className="block font-medium text-foreground">
                          Apagar esta credencial afetará o funcionamento da Controladoria sobre a OAB vinculada.
                        </span>
                        <span className="block">
                          Os processos dessa OAB não poderão mais ser atualizados automaticamente. Deseja continuar?
                        </span>
                      </>
                    ) : (
                      <span>Esta ação não pode ser desfeita. Tem certeza?</span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => { setDeleteConfirmId(null); setDeleteConfirmStep(1); }}>
                    Cancelar
                  </AlertDialogCancel>
                  {deleteConfirmStep === 1 ? (
                    <Button variant="destructive" onClick={() => setDeleteConfirmStep(2)}>Sim, continuar</Button>
                  ) : (
                    <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteCredencial.isPending}>
                      {deleteCredencial.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Confirmar exclusão
                    </Button>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </ScrollArea>
        </Tabs>
      </DialogContent>

      <BoletoPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        boleto={selectedBoleto}
        onDownloadBoleto={downloadBoleto}
      />
    </Dialog>
  );
}