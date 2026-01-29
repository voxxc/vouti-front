import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePlatformPixConfig } from '@/hooks/usePlatformPixConfig';
import { usePaymentConfirmation, PaymentConfirmation } from '@/hooks/usePaymentConfirmation';
import { TenantBoleto } from '@/hooks/useSubscription';
import {
  FileText,
  QrCode,
  Download,
  Copy,
  Check,
  Loader2,
  Upload,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  CreditCard
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BoletoPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boleto: TenantBoleto | null;
  onDownloadBoleto: (path: string, fileName: string) => Promise<boolean>;
}

export function BoletoPaymentDialog({
  open,
  onOpenChange,
  boleto,
  onDownloadBoleto
}: BoletoPaymentDialogProps) {
  const { toast } = useToast();
  const { config: pixConfig, loading: loadingPix } = usePlatformPixConfig();
  const { confirmarPagamento, saving, uploading, buscarConfirmacoes } = usePaymentConfirmation();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [confirmacoes, setConfirmacoes] = useState<PaymentConfirmation[]>([]);
  const [activeTab, setActiveTab] = useState('boleto');

  useEffect(() => {
    if (boleto && open) {
      buscarConfirmacoes(boleto.id).then(setConfirmacoes);
    }
  }, [boleto, open]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ title: 'Copiado!', description: 'Texto copiado para a área de transferência.' });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const handleDownload = async () => {
    if (!boleto?.url_boleto) return;
    setDownloading(true);
    await onDownloadBoleto(boleto.url_boleto, `boleto-${boleto.mes_referencia}.pdf`);
    setDownloading(false);
  };

  const handleConfirmarPagamento = async () => {
    if (!boleto) return;
    
    const success = await confirmarPagamento({
      boleto_id: boleto.id,
      metodo: activeTab as 'pix' | 'boleto',
      comprovante: comprovante || undefined
    });

    if (success) {
      setShowConfirmForm(false);
      setComprovante(null);
      // Atualizar lista de confirmações
      const updated = await buscarConfirmacoes(boleto.id);
      setConfirmacoes(updated);
    }
  };

  const getStatusConfirmacao = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-primary/10 text-primary"><CheckCircle2 className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejeitado':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Em análise</Badge>;
    }
  };

  if (!boleto) return null;

  const hasPendingConfirmation = confirmacoes.some(c => c.status === 'pendente');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pagamento - {boleto.mes_referencia}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Valor</p>
            <p className="text-xl font-bold">{formatCurrency(boleto.valor)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Vencimento</p>
            <p className="font-medium flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(boleto.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="boleto" className="gap-2">
              <FileText className="w-4 h-4" />
              Boleto
            </TabsTrigger>
            <TabsTrigger value="pix" className="gap-2" disabled={!pixConfig}>
              <QrCode className="w-4 h-4" />
              PIX
              {!pixConfig && <span className="text-xs">(indisponível)</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="boleto" className="mt-4 space-y-4">
            {boleto.codigo_barras && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Linha Digitável</Label>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-muted p-3 rounded-lg break-all font-mono">
                    {boleto.codigo_barras}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(boleto.codigo_barras!, 'barcode')}
                  >
                    {copiedField === 'barcode' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {boleto.url_boleto && (
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full gap-2"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Baixar Boleto PDF
              </Button>
            )}
          </TabsContent>

          <TabsContent value="pix" className="mt-4 space-y-4">
            {loadingPix ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : pixConfig ? (
              <>
                {pixConfig.qr_code_url && (
                  <div className="flex justify-center">
                    <img
                      src={pixConfig.qr_code_url}
                      alt="QR Code PIX"
                      className="w-48 h-48 rounded-lg border"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Chave PIX</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 text-sm bg-muted p-3 rounded-lg break-all">
                      {pixConfig.chave_pix}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(pixConfig.chave_pix, 'pix')}
                    >
                      {copiedField === 'pix' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Beneficiário: {pixConfig.nome_beneficiario}
                  </p>
                </div>

                <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Dica:</strong> Você pode agendar uma transferência recorrente no seu banco para evitar atrasos de pagamento!
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <QrCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>PIX não está disponível no momento</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator className="my-2" />

        {/* Confirmações existentes */}
        {confirmacoes.length > 0 && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">Confirmações enviadas</Label>
            {confirmacoes.map((conf) => (
              <div key={conf.id} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <span className="capitalize">{conf.metodo}</span>
                  <span className="text-muted-foreground">
                    {format(new Date(conf.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {getStatusConfirmacao(conf.status)}
              </div>
            ))}
          </div>
        )}

        {/* Formulário de confirmação */}
        {!showConfirmForm && !hasPendingConfirmation && boleto.status !== 'pago' && (
          <Button
            variant="outline"
            onClick={() => setShowConfirmForm(true)}
            className="w-full gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar Pagamento
          </Button>
        )}

        {showConfirmForm && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label>Comprovante (opcional)</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setComprovante(e.target.files?.[0] || null)}
              />
              {comprovante && (
                <p className="text-xs text-muted-foreground">{comprovante.name}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmForm(false);
                  setComprovante(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarPagamento}
                disabled={saving || uploading}
                className="flex-1 gap-2"
              >
                {(saving || uploading) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Enviar Confirmação
              </Button>
            </div>
          </div>
        )}

        {hasPendingConfirmation && (
          <div className="flex items-center gap-2 p-3 bg-secondary text-secondary-foreground rounded-lg text-sm">
            <Clock className="w-4 h-4" />
            Você já possui uma confirmação em análise para este boleto.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
