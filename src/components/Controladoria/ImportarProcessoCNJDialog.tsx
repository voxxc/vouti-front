import { useState } from 'react';
import { AlertTriangle, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OABCadastrada } from '@/hooks/useOABs';

interface ImportarProcessoCNJDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oab: OABCadastrada;
  onSuccess?: () => void;
}

// Formatar numero CNJ: 0000000-00.0000.0.00.0000
const formatCNJ = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 20);
  let formatted = '';
  
  if (digits.length > 0) formatted += digits.slice(0, 7);
  if (digits.length > 7) formatted += '-' + digits.slice(7, 9);
  if (digits.length > 9) formatted += '.' + digits.slice(9, 13);
  if (digits.length > 13) formatted += '.' + digits.slice(13, 14);
  if (digits.length > 14) formatted += '.' + digits.slice(14, 16);
  if (digits.length > 16) formatted += '.' + digits.slice(16, 20);
  
  return formatted;
};

export const ImportarProcessoCNJDialog = ({
  open,
  onOpenChange,
  oab,
  onSuccess
}: ImportarProcessoCNJDialogProps) => {
  const { user, tenantId } = useAuth();
  const [numeroCnj, setNumeroCnj] = useState('');
  const [importando, setImportando] = useState(false);

  const isValidCNJ = numeroCnj.replace(/\D/g, '').length === 20;

  const handleImportar = async () => {
    if (!isValidCNJ) return;

    setImportando(true);
    try {
      const { data, error } = await supabase.functions.invoke('judit-buscar-processo-cnj', {
        body: {
          numeroCnj,
          oabId: oab.id,
          tenantId,
          userId: user?.id
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao importar processo');

      toast({
        title: 'Processo importado',
        description: `${data.andamentosInseridos} andamentos registrados`
      });

      setNumeroCnj('');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Erro ao importar:', err);
      toast({
        title: 'Erro ao importar processo',
        description: err.message || 'Tente novamente',
        variant: 'destructive'
      });
    } finally {
      setImportando(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNumeroCnj(formatCNJ(e.target.value));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Importar Processo por CNJ
          </DialogTitle>
          <DialogDescription>
            Importe um processo diretamente pelo numero CNJ para a OAB {oab.oab_numero}/{oab.oab_uf}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="numero-cnj">Numero do Processo (CNJ)</Label>
            <Input
              id="numero-cnj"
              placeholder="0000000-00.0000.0.00.0000"
              value={numeroCnj}
              onChange={handleInputChange}
              className="font-mono"
              maxLength={25}
            />
            <p className="text-xs text-muted-foreground">
              Formato: NNNNNNN-DD.AAAA.J.TR.OOOO (20 digitos)
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Esta operacao gera custo na API Judit</p>
              <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
                O processo sera buscado, importado e seus andamentos registrados automaticamente.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importando}>
            Cancelar
          </Button>
          <Button
            onClick={handleImportar}
            disabled={!isValidCNJ || importando}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {importando ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Importar Processo (R$)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
