import { useState, useEffect } from 'react';
import { Download, Share, Plus, Check, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">App Instalado!</h1>
          <p className="text-muted-foreground">O Vouti já está na sua tela inicial. Abra pelo ícone do app.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#1a1a2e] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-3xl font-bold">V</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Instalar Vouti</h1>
          <p className="text-muted-foreground mt-2">
            Instale o app no seu celular para acesso rápido, sem precisar de loja.
          </p>
        </div>

        {/* Android / Desktop - prompt direto */}
        {deferredPrompt && (
          <Button onClick={handleInstall} className="w-full h-12 text-base" size="lg">
            <Download className="w-5 h-5 mr-2" />
            Instalar App
          </Button>
        )}

        {/* iOS - instruções manuais */}
        {isIOS && !deferredPrompt && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Como instalar no iPhone/iPad:</h2>
            <div className="space-y-3">
              <Step number={1} icon={<Share className="w-5 h-5" />}>
                Toque no botão <strong>Compartilhar</strong> <Share className="w-4 h-4 inline" /> na barra do Safari
              </Step>
              <Step number={2} icon={<Plus className="w-5 h-5" />}>
                Role e toque em <strong>"Adicionar à Tela de Início"</strong>
              </Step>
              <Step number={3} icon={<Check className="w-5 h-5" />}>
                Toque em <strong>"Adicionar"</strong> no canto superior direito
              </Step>
            </div>
          </div>
        )}

        {/* Fallback quando não há prompt nem é iOS */}
        {!deferredPrompt && !isIOS && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
              <Smartphone className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">No celular</p>
                <p className="text-sm text-muted-foreground">Abra este link no Chrome (Android) ou Safari (iPhone) e use o menu do navegador para instalar.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
              <Monitor className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">No computador</p>
                <p className="text-sm text-muted-foreground">No Chrome, clique no ícone de instalação na barra de endereço.</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Funciona offline • Abre em tela cheia • Sem ocupar espaço
        </p>
      </div>
    </div>
  );
};

const Step = ({ number, icon, children }: { number: number; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
      {number}
    </div>
    <p className="text-sm text-foreground leading-relaxed">{children}</p>
  </div>
);

export default Install;
