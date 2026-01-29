import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTenantBoletos, CreateBoletoData, TenantBoleto, PaymentMethod } from '@/hooks/useTenantBoletos';
import { Tenant } from '@/types/superadmin';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Plus, 
  Loader2, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Upload,
  FileText,
  ExternalLink,
  CreditCard,
  QrCode,
  Link as LinkIcon
} from 'lucide-react';
import { PaymentConfirmationsTab } from './PaymentConfirmationsTab';

interface SuperAdminBoletosDialogProps {
  tenant: Tenant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuperAdminBoletosDialog({ tenant, open, onOpenChange }: SuperAdminBoletosDialogProps) {
  const { boletos, loading, createBoleto, updateBoletoStatus, deleteBoleto, getSignedUrl } = useTenantBoletos(tenant.id);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState<CreateBoletoData>({
    mes_referencia: '',
    valor: 0,
    data_vencimento: '',
    codigo_barras: '',
    observacao: '',
    metodos_disponiveis: ['boleto', 'pix'],
    link_cartao: ''
  });

  const resetForm = () => {
    setFormData({
      mes_referencia: '',
      valor: 0,
      data_vencimento: '',
      codigo_barras: '',
      observacao: '',
      metodos_disponiveis: ['boleto', 'pix'],
      link_cartao: ''
    });
    setSelectedFile(null);
    setShowAddForm(false);
  };

  const toggleMethod = (method: PaymentMethod) => {
    setFormData(prev => {
      const current = prev.metodos_disponiveis || [];
      if (current.includes(method)) {
        return { ...prev, metodos_disponiveis: current.filter(m => m !== method) };
      }
      return { ...prev, metodos_disponiveis: [...current, method] };
    });
  };

  const hasMethod = (method: PaymentMethod) => {
    return formData.metodos_disponiveis?.includes(method) || false;
  };

  const handleSubmit = async () => {
    if (!formData.mes_referencia || !formData.valor || !formData.data_vencimento) return;
    
    setSaving(true);
    try {
      const success = await createBoleto(formData, selectedFile || undefined);
      if (success) {
        resetForm();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    try {
      await deleteBoleto(deleteId);
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleViewBoleto = async (boleto: TenantBoleto) => {
    if (!boleto.url_boleto) return;
    
    setDownloadingId(boleto.id);
    try {
      const signedUrl = await getSignedUrl(boleto.url_boleto);
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      }
    } finally {
      setDownloadingId(null);
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
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
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

  // Generate month options
  const monthOptions = [];
  const now = new Date();
  for (let i = -2; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = format(date, "MMMM/yyyy", { locale: ptBR });
    monthOptions.push({
      value: label.charAt(0).toUpperCase() + label.slice(1),
      label: label.charAt(0).toUpperCase() + label.slice(1)
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pagamentos - {tenant.name}
            </DialogTitle>
            <DialogDescription>
              Gerencie cobranças e confirmações de pagamento deste cliente
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="cobrancas" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cobrancas" className="gap-2">
                <FileText className="w-4 h-4" />
                Cobranças
              </TabsTrigger>
              <TabsTrigger value="confirmacoes" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Confirmações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cobrancas" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button 
                  onClick={() => setShowAddForm(!showAddForm)}
                  variant={showAddForm ? 'secondary' : 'default'}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {showAddForm ? 'Cancelar' : 'Adicionar Cobrança'}
                </Button>
              </div>

              {showAddForm && (
                <div className="border rounded-lg p-4 mb-4 space-y-4 bg-muted/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Mês Referência *</Label>
                      <Select
                        value={formData.mes_referencia}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, mes_referencia: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Valor *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                        placeholder="0,00"
                      />
                    </div>
                    
                    <div>
                      <Label>Data Vencimento *</Label>
                      <Input
                        type="date"
                        value={formData.data_vencimento}
                        onChange={(e) => setFormData(prev => ({ ...prev, data_vencimento: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label>PDF do Boleto</Label>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          ref={fileInputRef}
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {selectedFile ? selectedFile.name : 'Upload PDF'}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <Label>Código de Barras</Label>
                      <Input
                        value={formData.codigo_barras}
                        onChange={(e) => setFormData(prev => ({ ...prev, codigo_barras: e.target.value }))}
                        placeholder="Linha digitável do boleto"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label>Observação</Label>
                      <Textarea
                        value={formData.observacao}
                        onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                        placeholder="Observações sobre a cobrança..."
                        rows={2}
                      />
                    </div>

                    {/* Métodos de pagamento disponíveis */}
                    <div className="col-span-2 pt-2">
                      <Label className="mb-3 block">Métodos de Pagamento Disponíveis</Label>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="metodo-boleto"
                            checked={hasMethod('boleto')}
                            onCheckedChange={() => toggleMethod('boleto')}
                          />
                          <label htmlFor="metodo-boleto" className="text-sm flex items-center gap-1.5 cursor-pointer">
                            <FileText className="w-4 h-4" />
                            Boleto
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="metodo-pix"
                            checked={hasMethod('pix')}
                            onCheckedChange={() => toggleMethod('pix')}
                          />
                          <label htmlFor="metodo-pix" className="text-sm flex items-center gap-1.5 cursor-pointer">
                            <QrCode className="w-4 h-4" />
                            PIX
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="metodo-cartao"
                            checked={hasMethod('cartao')}
                            onCheckedChange={() => toggleMethod('cartao')}
                          />
                          <label htmlFor="metodo-cartao" className="text-sm flex items-center gap-1.5 cursor-pointer">
                            <CreditCard className="w-4 h-4" />
                            Cartão
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Link de pagamento para Cartão */}
                    {hasMethod('cartao') && (
                      <div className="col-span-2">
                        <Label className="flex items-center gap-1.5">
                          <LinkIcon className="w-4 h-4" />
                          Link de Pagamento (Cartão) *
                        </Label>
                        <Input
                          value={formData.link_cartao || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, link_cartao: e.target.value }))}
                          placeholder="https://pay.exemplo.com/checkout/..."
                          type="url"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Insira o link do gateway de pagamento (Mercado Pago, PagSeguro, Stripe, etc.)
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={
                        saving || 
                        !formData.mes_referencia || 
                        !formData.valor || 
                        !formData.data_vencimento ||
                        (hasMethod('cartao') && !formData.link_cartao) ||
                        (formData.metodos_disponiveis?.length === 0)
                      }
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Salvar Cobrança
                    </Button>
                  </div>
                </div>
              )}

              <ScrollArea className="h-[350px]">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : boletos.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma cobrança cadastrada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {boletos.map((boleto) => (
                      <div 
                        key={boleto.id}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{boleto.mes_referencia}</span>
                              {getStatusBadge(boleto.status)}
                            </div>
                            <div className="text-lg font-semibold">
                              {formatCurrency(boleto.valor)}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Vencimento: {format(new Date(boleto.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                            {boleto.observacao && (
                              <div className="text-xs text-muted-foreground mt-2 italic">
                                {boleto.observacao}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <Select
                              value={boleto.status}
                              onValueChange={(value: 'pendente' | 'pago' | 'vencido') => 
                                updateBoletoStatus(boleto.id, value)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="pago">Pago</SelectItem>
                                <SelectItem value="vencido">Vencido</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <div className="flex gap-1">
                              {boleto.url_boleto && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewBoleto(boleto)}
                                  disabled={downloadingId === boleto.id}
                                  title="Ver boleto"
                                >
                                  {downloadingId === boleto.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <ExternalLink className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(boleto.id)}
                                className="text-destructive hover:text-destructive"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="confirmacoes" className="mt-4">
              <PaymentConfirmationsTab tenantId={tenant.id} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cobrança</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta cobrança? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
