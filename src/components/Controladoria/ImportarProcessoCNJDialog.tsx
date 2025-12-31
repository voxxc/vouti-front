import { useState } from 'react';
import { Plus, RefreshCw, X, FileStack, FileText, AlertTriangle } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OABCadastrada } from '@/hooks/useOABs';
import { usePlanoLimites } from '@/hooks/usePlanoLimites';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

const isValidCNJ = (cnj: string) => cnj.replace(/\D/g, '').length === 20;

export const ImportarProcessoCNJDialog = ({
  open,
  onOpenChange,
  oab,
  onSuccess
}: ImportarProcessoCNJDialogProps) => {
  const { user, tenantId } = useAuth();
  const { podeCadastrarProcesso, uso, limites } = usePlanoLimites();
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  
  // Modo único
  const [numeroCnj, setNumeroCnj] = useState('');
  const [importando, setImportando] = useState(false);

  // Modo em massa
  const [cnjList, setCnjList] = useState<string[]>([]);
  const [novoCnj, setNovoCnj] = useState('');

  const handleImportar = async () => {
    if (!isValidCNJ(numeroCnj)) return;
    
    if (!podeCadastrarProcesso()) {
      toast({
        title: 'Limite atingido',
        description: 'Você atingiu o limite de processos cadastrados do seu plano.',
        variant: 'destructive'
      });
      return;
    }

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

  const handleNovoCnjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNovoCnj(formatCNJ(e.target.value));
  };

  const addCnjToList = () => {
    if (!isValidCNJ(novoCnj)) {
      toast({
        title: 'CNJ inválido',
        description: 'O número deve ter 20 dígitos',
        variant: 'destructive'
      });
      return;
    }

    // Verificar duplicado
    if (cnjList.includes(novoCnj)) {
      toast({
        title: 'CNJ duplicado',
        description: 'Este número já está na lista',
        variant: 'destructive'
      });
      return;
    }

    setCnjList(prev => [...prev, novoCnj]);
    setNovoCnj('');
  };

  const removeCnjFromList = (index: number) => {
    setCnjList(prev => prev.filter((_, i) => i !== index));
  };

  const handleImportarEmMassa = async () => {
    if (cnjList.length === 0) return;

    const processosParaImportar = [...cnjList];
    const total = processosParaImportar.length;

    // Fecha o dialog imediatamente
    setCnjList([]);
    setNovoCnj('');
    onOpenChange(false);

    toast({
      title: 'Importação iniciada',
      description: `Importando ${total} processo${total > 1 ? 's' : ''} em segundo plano...`
    });

    // Processa em background
    let sucesso = 0;
    let erros = 0;

    for (let i = 0; i < processosParaImportar.length; i++) {
      const cnj = processosParaImportar[i];
      try {
        const { data, error } = await supabase.functions.invoke('judit-buscar-processo-cnj', {
          body: {
            numeroCnj: cnj,
            oabId: oab.id,
            tenantId,
            userId: user?.id
          }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erro');

        sucesso++;
        toast({
          title: `Progresso: ${i + 1}/${total}`,
          description: `Processo ${cnj.slice(0, 15)}... importado`
        });
      } catch (err: any) {
        erros++;
        console.error(`Erro ao importar ${cnj}:`, err);
        toast({
          title: `Erro no processo ${i + 1}/${total}`,
          description: `${cnj.slice(0, 15)}... - ${err.message || 'Falha'}`,
          variant: 'destructive'
        });
      }
    }

    // Toast final
    toast({
      title: 'Importação concluída',
      description: `${sucesso} processo${sucesso !== 1 ? 's' : ''} importado${sucesso !== 1 ? 's' : ''}${erros > 0 ? `, ${erros} erro${erros !== 1 ? 's' : ''}` : ''}`
    });

    onSuccess?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCnjToList();
    }
  };

  const handleClose = () => {
    setNumeroCnj('');
    setCnjList([]);
    setNovoCnj('');
    setMode('single');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Importar Processo por CNJ
          </DialogTitle>
          <DialogDescription>
            Importe processos pelo número CNJ para a OAB {oab.oab_numero}/{oab.oab_uf}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'single' | 'bulk')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Único
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <FileStack className="w-4 h-4" />
              Em Massa
            </TabsTrigger>
          </TabsList>

          {/* Modo Único */}
          <TabsContent value="single" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="numero-cnj">Número do Processo (CNJ)</Label>
              <Input
                id="numero-cnj"
                placeholder="0000000-00.0000.0.00.0000"
                value={numeroCnj}
                onChange={handleInputChange}
                className="font-mono"
                maxLength={25}
              />
              <p className="text-xs text-muted-foreground">
                Formato: NNNNNNN-DD.AAAA.J.TR.OOOO (20 dígitos)
              </p>
            </div>
          </TabsContent>

          {/* Modo Em Massa */}
          <TabsContent value="bulk" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Adicionar CNJs à lista</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="0000000-00.0000.0.00.0000"
                  value={novoCnj}
                  onChange={handleNovoCnjChange}
                  onKeyDown={handleKeyDown}
                  className="font-mono flex-1"
                  maxLength={25}
                />
                <Button 
                  type="button" 
                  onClick={addCnjToList}
                  disabled={!isValidCNJ(novoCnj)}
                  size="icon"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Digite o CNJ e pressione Enter ou clique no + para adicionar
              </p>
            </div>

            {cnjList.length > 0 && (
              <div className="space-y-2">
                <Label>Processos na fila ({cnjList.length})</Label>
                <ScrollArea className="h-48 rounded-md border p-2">
                  <div className="space-y-2">
                    {cnjList.map((cnj, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2"
                      >
                        <span className="text-xs text-muted-foreground w-6">
                          {index + 1}.
                        </span>
                        <span className="font-mono text-sm flex-1">{cnj}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeCnjFromList(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {cnjList.length === 0 && (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm border rounded-md bg-muted/20">
                Nenhum processo adicionado ainda
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importando}>
            Cancelar
          </Button>
          
          {mode === 'single' ? (
            <Button
              onClick={handleImportar}
              disabled={!isValidCNJ(numeroCnj) || importando}
            >
              {importando ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Importar Processo
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleImportarEmMassa}
              disabled={cnjList.length === 0}
            >
              <FileStack className="w-4 h-4 mr-2" />
              Importar {cnjList.length} Processo{cnjList.length !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
