import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AvisoPendente } from '@/hooks/useAvisosPendentes';

interface AvisoBannerProps {
  avisos: AvisoPendente[];
  onConfirmarCiencia: (avisoId: string) => Promise<void>;
}

export function AvisoBanner({ avisos, onConfirmarCiencia }: AvisoBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  if (avisos.length === 0) return null;

  const currentAviso = avisos[currentIndex];

  const handleCienciaClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirmarCiencia(currentAviso.id);
      
      // Move to next aviso or close
      if (currentIndex < avisos.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error confirming ciencia:', error);
    } finally {
      setIsConfirming(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      {/* Overlay escuro com blur */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]" />
      
      {/* Banner centralizado */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
        <Card className="max-w-2xl w-full shadow-2xl border-2 animate-in fade-in zoom-in duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">
                  📢 {currentAviso.titulo}
                </CardTitle>
                {avisos.length > 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Aviso {currentIndex + 1} de {avisos.length}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Imagem do comunicado */}
            <div className="relative rounded-lg overflow-hidden">
              <img 
                src={currentAviso.imagem_url} 
                alt={currentAviso.titulo}
                className="w-full max-h-[50vh] object-contain bg-muted"
              />
            </div>
            
            {/* Descrição */}
            {currentAviso.descricao && (
              <p className="text-muted-foreground text-center">
                {currentAviso.descricao}
              </p>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center pt-2 pb-6">
            <Button 
              size="lg" 
              onClick={handleCienciaClick}
              className="px-8"
            >
              Estou Ciente
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Dialog de Dupla Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="z-[102]">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Ciência</AlertDialogTitle>
            <AlertDialogDescription>
              Ao confirmar, você declara estar ciente deste comunicado.
              <br />
              <strong>Este aviso não será exibido novamente.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirming}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? 'Confirmando...' : 'Confirmar Ciência'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
