import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';

interface BuscarAndamentosPJEProps {
  processoId: string;
  numeroProcesso: string;
  tribunal: string;
  onComplete?: () => void;
}

export const BuscarAndamentosPJE = ({
  processoId,
  numeroProcesso,
  tribunal,
  onComplete
}: BuscarAndamentosPJEProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleBuscar = async () => {
    setIsLoading(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Buscando andamentos PJE...');

      const { data, error } = await supabase.functions.invoke('buscar-andamentos-pje', {
        body: {
          processo_id: processoId,
          numero_processo: numeroProcesso,
          tribunal: tribunal,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Andamentos atualizados',
          description: `Encontradas ${data.total_encontradas} movimentações. ${data.novas_inseridas} novas inseridas.`,
        });

        if (onComplete) {
          onComplete();
        }
      } else {
        throw new Error(data.error || 'Erro ao buscar andamentos');
      }

    } catch (error) {
      console.error('Erro ao buscar andamentos:', error);
      toast({
        title: 'Erro ao buscar andamentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleBuscar}
      disabled={isLoading}
      variant="outline"
      size="sm"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Buscando...' : 'Buscar Andamentos PJE'}
    </Button>
  );
};
