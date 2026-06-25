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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OABCadastrada } from '@/hooks/useOABs';
import { usePlanoLimites } from '@/hooks/usePlanoLimites';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { extrairTribunalDoNumeroProcesso } from '@/utils/processoHelpers';
import { parseCnjComApartado } from '@/utils/processoOABHelpers';

interface ImportarProcessoCNJDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oab: OABCadastrada;
  onSuccess?: () => void;
}

// Formata CNJ preservando sufixo de apartado (tudo após os 20 primeiros dígitos)
const formatCNJ = (value: string) => {
  const parsed = parseCnjComApartado(value);
  if (parsed.cnjPrincipal) {
    return parsed.cnjPrincipal + (parsed.sufixoApartado || '');
  }
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

const isValidCNJ = (cnj: string) => parseCnjComApartado(cnj).valido;

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

  // Modo em massa
  const [cnjList, setCnjList] = useState<string[]>([]);
  const [novoCnj, setNovoCnj] = useState('');

  const importarUmCnj = async (
    cnjInput: string
  ): Promise<{ success: boolean; duplicado?: boolean; reaproveitado?: boolean; andamentosInseridos?: number; error?: string }> => {
    const parsed = parseCnjComApartado(cnjInput);
    if (!parsed.valido || !parsed.cnjPrincipal) {
      return { success: false, error: 'CNJ inválido' };
    }
    const apartado = !!parsed.sufixoApartado;
    const numeroFinal = parsed.cnjPrincipal + (parsed.sufixoApartado || '');

    if (!user?.id) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    // 1. Verificar duplicidade na OAB atual (tabela exibida na tela)
    const { data: existenteOab } = await supabase
      .from('processos_oab')
      .select('id, detalhes_carregados, capa_completa, tribunal')
      .eq('oab_id', oab.id)
      .eq('numero_cnj', numeroFinal)
      .maybeSingle();

    // 2. Garantir registro espelho em `processos` (o Escavador grava capa/andamentos lá)
    let processoId: string;
    const { data: procExistente } = await supabase
      .from('processos')
      .select('id, tenant_id')
      .eq('numero_processo', numeroFinal)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (procExistente) {
      processoId = procExistente.id;
    } else {
      const { data: novoProc, error: errNovoProc } = await supabase
        .from('processos')
        .insert({
          numero_processo: numeroFinal,
          tenant_id: tenantId,
          created_by: user.id,
          parte_ativa: '',
          parte_passiva: '',
          status: 'em_andamento',
        })
        .select('id')
        .single();
      if (errNovoProc || !novoProc) {
        return { success: false, error: errNovoProc?.message || 'Falha ao criar processo' };
      }
      processoId = novoProc.id;
    }

    // 3. Verificar se a capa já está completa (não considerar escavador_id sozinho)
    if (existenteOab) {
      const { data: monit } = await supabase
        .from('processo_monitoramento_escavador')
        .select('classe, tribunal, assunto')
        .eq('processo_id', processoId)
        .maybeSingle();

      const { count: andamentosCount } = await supabase
        .from('processo_atualizacoes_escavador')
        .select('id', { count: 'exact', head: true })
        .eq('processo_id', processoId);

      const temCapa = !!(
        existenteOab.detalhes_carregados ||
        existenteOab.tribunal ||
        (existenteOab.capa_completa && Object.keys(existenteOab.capa_completa as object).length > 0) ||
        (monit && (monit.classe || monit.tribunal || monit.assunto)) ||
        (andamentosCount ?? 0) > 0
      );
      if (temCapa) {
        return { success: false, duplicado: true };
      }
    } else {
      // 4. Criar registro em processos_oab para que apareça na lista da OAB
      const tribunalSigla = extrairTribunalDoNumeroProcesso(numeroFinal);
      const { error: errOab } = await supabase
        .from('processos_oab')
        .insert({
          oab_id: oab.id,
          numero_cnj: numeroFinal,
          tribunal_sigla: tribunalSigla,
          tenant_id: tenantId,
          importado_manualmente: true,
          importado_por: user.id,
          importado_por_email: user.email ?? null,
          api_provider: 'escavador',
          apartado,
          apartado_em: apartado ? new Date().toISOString() : null,
          apartado_por: apartado ? user.id : null,
        });
      if (errOab) {
        return { success: false, error: errOab.message };
      }
    }

    // 5. Apartado: não consulta Escavador (apenas visual)
    if (apartado) {
      return {
        success: true,
        reaproveitado: !!existenteOab,
        andamentosInseridos: 0,
      };
    }

    // 6. Disparar Escavador (capa + andamentos)
    const { data, error } = await supabase.functions.invoke('escavador-importar-processo', {
      body: {
        processoId,
        numeroProcesso: numeroFinal,
        tenantId,
        ativarMonitoramento: false,
        modo: 'rapido',
      },
    });

    if (error) return { success: false, error: error.message };
    if (!data?.success) {
      return { success: false, error: data?.error || data?.message || 'Falha ao importar processo' };
    }

    // A própria edge function já atualiza processos_oab com a capa completa.
    return {
      success: true,
      reaproveitado: !!existenteOab,
      andamentosInseridos: data?.andamentosInseridos ?? 0,
    };
  };

  const handleImportar = () => {
    if (!isValidCNJ(numeroCnj)) return;
    
    if (!podeCadastrarProcesso()) {
      toast({
        title: 'Limite atingido',
        description: 'Você atingiu o limite de processos cadastrados do seu plano.',
        variant: 'destructive'
      });
      return;
    }

    const cnjParaImportar = numeroCnj;
    setNumeroCnj('');
    onOpenChange(false);

    // Notificar início
    toast({
      title: 'Importação iniciada',
      description: 'Buscando processo em segundo plano...'
    });

    importarUmCnj(cnjParaImportar)
      .then((res) => {
        if (res.duplicado) {
          toast({
            title: '⚠️ Processo já cadastrado',
            description: 'Este processo já consta na sua base de dados com dados completos.',
          });
        } else if (!res.success) {
          toast({
            title: 'Erro ao importar processo',
            description: res.error || 'Tente novamente',
            variant: 'destructive',
          });
        } else {
          toast({
            title: res.reaproveitado ? 'Processo atualizado' : 'Processo importado',
            description: `${res.andamentosInseridos ?? 0} andamentos registrados`,
          });
          onSuccess?.();
        }
      })
      .catch((err: any) => {
        console.error('Erro ao importar:', err);
        toast({
          title: 'Erro ao importar processo',
          description: err.message || 'Falha na conexão',
          variant: 'destructive',
        });
      });
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

    // Verificar limite de processos
    const espacoDisponivel = (limites.processos_cadastrados ?? Infinity) - (uso.processos_cadastrados ?? 0);
    
    if (espacoDisponivel <= 0) {
      toast({
        title: 'Limite atingido',
        description: 'Você atingiu o limite de processos cadastrados do seu plano.',
        variant: 'destructive'
      });
      return;
    }

    let processosParaImportar = [...cnjList];
    
    if (cnjList.length > espacoDisponivel && limites.processos_cadastrados !== null) {
      toast({
        title: 'Limite de processos',
        description: `Você pode importar apenas ${espacoDisponivel} processo(s). Importando os primeiros da lista.`,
        variant: 'destructive'
      });
      processosParaImportar = cnjList.slice(0, espacoDisponivel);
    }

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
        const res = await importarUmCnj(cnj);
        if (res.duplicado) throw new Error('Já cadastrado');
        if (!res.success) throw new Error(res.error || 'Erro');

        sucesso++;
        toast({
          title: `Progresso: ${i + 1}/${total}`,
          description: `Processo ${cnj.slice(0, 15)}... ${res.reaproveitado ? 'atualizado' : 'importado'}`
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
          <TabsContent value="single" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="numero-cnj">Número do Processo (CNJ)</Label>
              <Input
                id="numero-cnj"
                placeholder="0000000-00.0000.0.00.0000 ou .../sufixo-do-apartado"
                value={numeroCnj}
                onChange={handleInputChange}
                className="font-mono"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                Cole o CNJ. Se houver sufixo após "/", ele será detectado como apartado automaticamente.
              </p>
            </div>

            {(() => {
              const parsed = parseCnjComApartado(numeroCnj);
              if (!parsed.valido || !parsed.cnjPrincipal) return null;
              return (
                <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      CNJ principal
                    </span>
                    <span className="font-mono text-sm">{parsed.cnjPrincipal}</span>
                  </div>
                  {parsed.sufixoApartado && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">
                          Apartado
                        </span>
                        <Badge variant="outline" className="border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px]">
                          detectado
                        </Badge>
                      </div>
                      <span className="font-mono text-sm">{parsed.sufixoApartado}</span>
                    </div>
                  )}
                </div>
              );
            })()}
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
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          
          {mode === 'single' ? (
            <Button
              onClick={handleImportar}
              disabled={!isValidCNJ(numeroCnj)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Importar Processo
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
