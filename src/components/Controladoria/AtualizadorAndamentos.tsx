import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface AtualizadorAndamentosProps {
  onComplete?: () => void;
}

const AtualizadorAndamentos = ({ onComplete }: AtualizadorAndamentosProps) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultado, setResultado] = useState<{
    processosVerificados: number;
    processosComSucesso: number;
    processosComErro: number;
    andamentosAdicionados: number;
    erros?: string[];
  } | null>(null);

  const atualizarAndamentos = async () => {
    setIsUpdating(true);
    setProgress(0);
    setResultado(null);

    try {
      // Simular progresso
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      const { data, error } = await supabase.functions.invoke('atualizar-andamentos-processos', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      if (data?.success) {
        const descricao = data.processosComErro > 0
          ? `${data.processosComSucesso} sucesso, ${data.processosComErro} com erro. ${data.andamentosAdicionados} novos andamentos.`
          : `${data.processosVerificados} processos verificados. ${data.andamentosAdicionados} novos andamentos adicionados.`;

        toast({
          title: 'Atualização concluída',
          description: descricao,
        });

        setResultado({
          processosVerificados: data.processosVerificados,
          processosComSucesso: data.processosComSucesso,
          processosComErro: data.processosComErro,
          andamentosAdicionados: data.andamentosAdicionados,
          erros: data.erros
        });

        if (onComplete) {
          onComplete();
        }
      } else {
        throw new Error(data?.error || 'Erro ao atualizar andamentos');
      }
    } catch (error: any) {
      console.error('Erro ao atualizar andamentos:', error);
      toast({
        title: 'Erro na atualização',
        description: error.message || 'Não foi possível atualizar os andamentos',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Atualizar Andamentos
        </CardTitle>
        <CardDescription>
          Buscar novos andamentos processuais de todos os processos cadastrados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isUpdating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Verificando processos...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {resultado && !isUpdating && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Atualização concluída</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Sucesso:</span>
                <span>{resultado.processosComSucesso}</span>
              </div>
              {resultado.processosComErro > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">Com erro:</span>
                  <span>{resultado.processosComErro}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Novos andamentos:</span>
                <span>{resultado.andamentosAdicionados}</span>
                {resultado.andamentosAdicionados > 0 && (
                  <Badge variant="destructive" className="animate-pulse ml-1">
                    Pendentes
                  </Badge>
                )}
              </div>
            </div>
            
            {resultado.erros && resultado.erros.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <p className="font-medium text-yellow-600 mb-2 text-sm">Erros encontrados:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {resultado.erros.map((erro, idx) => (
                    <li key={idx}>• {erro}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={atualizarAndamentos} 
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Atualizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar Andamentos
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Novos andamentos serão marcados como "Pendentes" até a conferência
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AtualizadorAndamentos;
