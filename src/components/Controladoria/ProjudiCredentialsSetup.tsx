import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Key, Lock, User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import jsQR from 'jsqr';

interface ProjudiCredentialsSetupProps {
  onSuccess?: () => void;
}

const ProjudiCredentialsSetup = ({ onSuccess }: ProjudiCredentialsSetupProps) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [qrCodeStatus, setQrCodeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractSecretFromQRCode = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      console.log('🔍 Iniciando leitura do QR Code:', {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        fileType: file.type
      });

      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            console.error('❌ Erro ao criar contexto do canvas');
            resolve(null);
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          console.log('📐 Dimensões da imagem:', {
            width: img.width,
            height: img.height
          });

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            console.log('📋 QR Code detectado:', code.data.substring(0, 50) + '...');
            
            // Validar formato otpauth
            if (!code.data.startsWith('otpauth://totp/')) {
              console.error('❌ QR Code inválido. Esperado formato: otpauth://totp/...');
              console.error('Recebido:', code.data.substring(0, 100));
              toast.error('QR Code não é do Google Authenticator');
              resolve(null);
              return;
            }

            // QR code format: otpauth://totp/Projudi:email?secret=XXXXX&issuer=Projudi
            const match = code.data.match(/secret=([A-Z2-7]+)/i);
            if (match && match[1]) {
              console.log('✅ Secret extraído com sucesso (length:', match[1].length + ')');
              resolve(match[1]);
            } else {
              console.error('❌ Secret não encontrado no QR Code');
              console.error('Conteúdo do QR:', code.data);
              toast.error('QR Code não contém o código secreto esperado');
              resolve(null);
            }
          } else {
            console.error('❌ Nenhum QR Code detectado na imagem');
            console.error('Verifique se a imagem está clara e completa');
            resolve(null);
          }
        };
        
        img.onerror = () => {
          console.error('❌ Erro ao carregar a imagem');
          resolve(null);
        };
        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        console.error('❌ Erro ao ler o arquivo');
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho máximo (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Tamanho máximo: 5MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, envie uma imagem válida (PNG, JPG, etc.)');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setQrCodeFile(file);
    setIsProcessing(true);
    setQrCodeStatus('idle');

    try {
      const secret = await extractSecretFromQRCode(file);
      
      if (secret) {
        setTotpSecret(secret);
        setQrCodeStatus('success');
      } else {
        setQrCodeStatus('error');
        toast.error('Não foi possível ler o QR Code. Use o campo manual abaixo.');
      }
    } catch (error) {
      console.error('Erro ao processar QR code:', error);
      setQrCodeStatus('error');
      toast.error('Erro ao processar QR Code. Use o campo manual abaixo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!login || !password || !totpSecret) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar autenticado');
        return;
      }

      const response = await supabase.functions.invoke('validar-credenciais-projudi', {
        body: {
          login,
          password,
          totpSecret,
          tribunal: 'TJPR'
        }
      });

      if (response.error) {
        throw response.error;
      }

      if (response.data?.success) {
        
        // Reset form
        setLogin('');
        setPassword('');
        setTotpSecret('');
        setQrCodeFile(null);
        setQrCodeStatus('idle');
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        onSuccess?.();
      } else {
        throw new Error(response.data?.error || 'Erro ao validar credenciais');
      }
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error);
      toast.error(error.message || 'Erro ao configurar credenciais');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Configurar Acesso ao Projudi TJPR
        </CardTitle>
        <CardDescription>
          Configure suas credenciais uma única vez para buscar andamentos automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Login */}
        <div className="space-y-2">
          <Label htmlFor="login" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Login do Projudi
          </Label>
          <Input
            id="login"
            type="text"
            placeholder="Seu login do Projudi"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            disabled={isSaving}
          />
        </div>

        {/* Senha */}
        <div className="space-y-2">
          <Label htmlFor="password" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Senha do Projudi
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Sua senha do Projudi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSaving}
          />
        </div>

        {/* QR Code Upload */}
        <div className="space-y-2">
          <Label htmlFor="qrcode" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            QR Code do Google Authenticator
          </Label>
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              id="qrcode"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isProcessing || isSaving}
              className="flex-1"
            />
            {qrCodeStatus === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-2" />
            )}
            {qrCodeStatus === 'error' && (
              <AlertCircle className="w-5 h-5 text-destructive mt-2" />
            )}
            {isProcessing && (
              <Loader2 className="w-5 h-5 text-muted-foreground mt-2 animate-spin" />
            )}
          </div>
          
          {/* Preview da imagem */}
          {qrCodeFile && (
            <div className="border rounded-lg p-2 bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">Preview do QR Code:</p>
              <img 
                src={URL.createObjectURL(qrCodeFile)} 
                alt="QR Code Preview"
                className="max-w-[200px] mx-auto rounded"
              />
            </div>
          )}
        </div>

        {/* Campo Manual para Secret (Fallback) */}
        <div className="space-y-2">
          <Label htmlFor="manual-secret" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Código Secreto (Alternativa Manual)
          </Label>
          <Input
            id="manual-secret"
            type="text"
            placeholder="Digite o código secreto (16-32 caracteres): ABCD1234..."
            value={totpSecret}
            onChange={(e) => {
              const value = e.target.value.toUpperCase().replace(/[^A-Z2-7]/g, '');
              setTotpSecret(value);
              if (value.length >= 16) {
                setQrCodeStatus('success');
              }
            }}
            disabled={isSaving}
            maxLength={32}
            className="font-mono"
          />
          {totpSecret && (
            <p className="text-xs text-muted-foreground">
              ✅ Segredo TOTP: {totpSecret.length} caracteres ({totpSecret.substring(0, 8)}...)
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            💡 Use este campo se o upload do QR Code não funcionar. Cole o código secreto exibido no Projudi.
          </p>
        </div>

        {/* Instruções */}
        <Alert>
          <AlertDescription className="text-sm space-y-2">
            <p className="font-medium">📸 Como obter o QR Code:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Acesse as configurações do Google Authenticator no Projudi</li>
              <li>Tire um print ou foto do QR Code exibido na tela</li>
              <li>Faça upload da imagem aqui</li>
              <li>O sistema lerá automaticamente o código secreto</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              🔒 Suas credenciais serão criptografadas com AES-256 e armazenadas com segurança.
            </p>
          </AlertDescription>
        </Alert>

        {/* Save Button */}
        <Button 
          onClick={handleSaveCredentials}
          disabled={!login || !password || !totpSecret || isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Validando e Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Salvar Credenciais
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProjudiCredentialsSetup;