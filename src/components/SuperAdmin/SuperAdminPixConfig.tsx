import { useState, useEffect } from 'react';
import { usePlatformPixConfig, PlatformPixConfig } from '@/hooks/usePlatformPixConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  QrCode,
  Upload,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type TipoChave = 'email' | 'cpf' | 'cnpj' | 'celular' | 'aleatoria';

const tiposChave: { value: TipoChave; label: string }[] = [
  { value: 'email', label: 'E-mail' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'celular', label: 'Celular' },
  { value: 'aleatoria', label: 'Chave Aleatória' },
];

export function SuperAdminPixConfig() {
  const { loading, saving, saveConfig, uploadQRCode, deleteQRCode, fetchAllConfigs } = usePlatformPixConfig();

  const [config, setConfig] = useState<PlatformPixConfig | null>(null);
  const [formData, setFormData] = useState({
    chave_pix: '',
    tipo_chave: 'email' as TipoChave,
    nome_beneficiario: '',
    ativo: true,
  });
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      const existingConfig = await fetchAllConfigs();
      if (existingConfig) {
        setConfig(existingConfig);
        setFormData({
          chave_pix: existingConfig.chave_pix,
          tipo_chave: existingConfig.tipo_chave,
          nome_beneficiario: existingConfig.nome_beneficiario,
          ativo: existingConfig.ativo,
        });
        setQrCodeUrl(existingConfig.qr_code_url);
      }
      setLoadingInitial(false);
    };
    loadConfig();
  }, []);

  const handleQRCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrCodeFile(file);
      // Preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrCodeUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveQRCode = async () => {
    if (config?.qr_code_url) {
      await deleteQRCode(config.qr_code_url);
    }
    setQrCodeUrl(null);
    setQrCodeFile(null);
  };

  const handleSave = async () => {
    if (!formData.chave_pix || !formData.nome_beneficiario) {
      return;
    }

    setUploading(true);
    let uploadedUrl = config?.qr_code_url || null;

    // Se tem um novo arquivo, fazer upload
    if (qrCodeFile) {
      const url = await uploadQRCode(qrCodeFile);
      if (url) {
        uploadedUrl = url;
      }
    } else if (!qrCodeUrl && config?.qr_code_url) {
      // Se removeu o QR Code
      uploadedUrl = null;
    }

    await saveConfig({
      chave_pix: formData.chave_pix,
      tipo_chave: formData.tipo_chave,
      nome_beneficiario: formData.nome_beneficiario,
      qr_code_url: uploadedUrl,
      ativo: formData.ativo,
    });

    setQrCodeFile(null);
    setUploading(false);
    
    // Recarregar config
    const updatedConfig = await fetchAllConfigs();
    if (updatedConfig) {
      setConfig(updatedConfig);
      setQrCodeUrl(updatedConfig.qr_code_url);
    }
  };

  if (loadingInitial) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Configuração PIX
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Configuração PIX da Plataforma
        </CardTitle>
        <CardDescription>
          Configure a chave PIX que será exibida para os clientes realizarem pagamentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Ativo */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label>Status do PIX</Label>
            <p className="text-sm text-muted-foreground">
              Quando ativo, os clientes poderão ver a opção de pagamento via PIX
            </p>
          </div>
          <Switch
            checked={formData.ativo}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
          />
        </div>

        {!formData.ativo && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O PIX está desativado. Os clientes não verão esta opção de pagamento.
            </AlertDescription>
          </Alert>
        )}

        {/* Tipo de Chave */}
        <div className="space-y-2">
          <Label>Tipo de Chave</Label>
          <Select
            value={formData.tipo_chave}
            onValueChange={(value: TipoChave) => setFormData(prev => ({ ...prev, tipo_chave: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiposChave.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chave PIX */}
        <div className="space-y-2">
          <Label>Chave PIX *</Label>
          <Input
            value={formData.chave_pix}
            onChange={(e) => setFormData(prev => ({ ...prev, chave_pix: e.target.value }))}
            placeholder={
              formData.tipo_chave === 'email' ? 'financeiro@vouti.com.br' :
              formData.tipo_chave === 'cpf' ? '000.000.000-00' :
              formData.tipo_chave === 'cnpj' ? '00.000.000/0001-00' :
              formData.tipo_chave === 'celular' ? '+55 (00) 00000-0000' :
              'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
            }
          />
        </div>

        {/* Nome Beneficiário */}
        <div className="space-y-2">
          <Label>Nome do Beneficiário *</Label>
          <Input
            value={formData.nome_beneficiario}
            onChange={(e) => setFormData(prev => ({ ...prev, nome_beneficiario: e.target.value }))}
            placeholder="VOUTI SISTEMAS LTDA"
          />
          <p className="text-xs text-muted-foreground">
            Nome que aparecerá para os clientes ao realizar o pagamento
          </p>
        </div>

        {/* QR Code */}
        <div className="space-y-4">
          <Label>QR Code</Label>
          
          <div className="flex items-start gap-6">
            {/* Preview */}
            <div className="flex-shrink-0">
              {qrCodeUrl ? (
                <div className="relative group">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code PIX"
                    className="w-40 h-40 rounded-lg border object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleRemoveQRCode}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-40 h-40 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted">
                  <QrCode className="w-12 h-12 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {/* Upload */}
            <div className="flex-1 space-y-2">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleQRCodeChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Faça upload da imagem do QR Code PIX (PNG, JPG ou WebP)
              </p>
              {qrCodeFile && (
                <p className="text-sm text-primary">
                  Novo arquivo selecionado: {qrCodeFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <Button
          onClick={handleSave}
          disabled={saving || uploading || !formData.chave_pix || !formData.nome_beneficiario}
          className="w-full"
        >
          {(saving || uploading) ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}
