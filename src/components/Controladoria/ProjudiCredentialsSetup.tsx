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
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(null);
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            // QR code format: otpauth://totp/Projudi:email?secret=XXXXX&issuer=Projudi
            const match = code.data.match(/secret=([A-Z2-7]+)/i);
            if (match && match[1]) {
              resolve(match[1]);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };
        
        img.onerror = () => resolve(null);
        img.src = e.target?.result as string;
      };

      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setQrCodeFile(file);
    setIsProcessing(true);
    setQrCodeStatus('idle');

    try {
      const secret = await extractSecretFromQRCode(file);
      
      if (secret) {
        setTotpSecret(secret);
        setQrCodeStatus('success');
        toast.success('QR Code lido com sucesso!');
      } else {
        setQrCodeStatus('error');
        toast.error('Não foi possível ler o QR Code. Tente outra imagem.');
      }
    } catch (error) {
      console.error('Erro ao processar QR code:', error);
      setQrCodeStatus('error');
      toast.error('Erro ao processar QR Code');
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
        toast.success('Credenciais configuradas com sucesso! ✅');
        
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
          {totpSecret && (
            <p className="text-xs text-muted-foreground">
              ✅ Segredo TOTP detectado: {totpSecret.substring(0, 8)}...
            </p>
          )}
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