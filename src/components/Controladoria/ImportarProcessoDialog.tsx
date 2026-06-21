import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { usePlanoLimites } from "@/hooks/usePlanoLimites";
import type { ProcessoOAB } from "@/types/busca-oab";
import { extrairTribunalDoNumeroProcesso } from "@/utils/processoHelpers";
import { extrairPartesDoProcesso } from "@/utils/processoOABHelpers";

interface ImportarProcessoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processo: ProcessoOAB | null;
}

export const ImportarProcessoDialog = ({
  open,
  onOpenChange,
  processo
}: ImportarProcessoDialogProps) => {
  const { toast } = useToast();
  const { navigate } = useTenantNavigation();
  const { podeMonitorarProcesso, uso, limites } = usePlanoLimites();
  const [importando, setImportando] = useState(false);
  const [ativarMonitoramento, setAtivarMonitoramento] = useState(false);
  
  const limiteMonitoramentoAtingido = !podeMonitorarProcesso();
  
  // Desabilitar monitoramento automaticamente se limite atingido
  useEffect(() => {
    if (limiteMonitoramentoAtingido && ativarMonitoramento) {
      setAtivarMonitoramento(false);
    }
  }, [limiteMonitoramentoAtingido, ativarMonitoramento]);

  const handleImportar = async () => {
    if (!processo) return;

    setImportando(true);
    
    try {
      console.log('[Importar] 🔄 Iniciando importação:', processo.numero_cnj);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar tenant_id do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      const tenantId = profile?.tenant_id;

      // Extrair tribunal da sigla
      const tribunalSigla = extrairTribunalDoNumeroProcesso(processo.numero_cnj);
      
      // Buscar tribunal no banco
      const { data: tribunalData } = await supabase
        .from('tribunais')
        .select('id, sigla')
        .eq('sigla', tribunalSigla)
        .single();

      // Extrair partes do processo
      const partesExtraidas = extrairPartesDoProcesso(processo);

      // Verificar duplicidade antes de inserir
      const { data: existente } = await supabase
        .from('processos')
        .select('id')
        .eq('numero_processo', processo.numero_cnj)
        .maybeSingle();

      if (existente) {
        // Verificar se a capa do Escavador já foi populada
        const { data: monit } = await supabase
          .from('processo_monitoramento_escavador')
          .select('classe, tribunal, escavador_id')
          .eq('processo_id', existente.id)
          .maybeSingle();

        const temCapa = !!(monit && (monit.classe || monit.tribunal || monit.escavador_id));
        if (temCapa) {
          toast({
            title: '⚠️ Processo já cadastrado',
            description: 'Este processo já consta na sua base com dados completos.',
          });
          onOpenChange(false);
          return;
        }

        // Reaproveitar processo existente: chamar Escavador para popular capa + andamentos
        toast({
          title: '🔄 Atualizando processo existente',
          description: 'Carregando dados do Escavador em segundo plano...',
        });
        onOpenChange(false);
        navigate(`/controladoria/processos/${existente.id}`);

        supabase.functions.invoke('escavador-importar-processo', {
          body: {
            processoId: existente.id,
            numeroProcesso: processo.numero_cnj,
            tenantId,
            ativarMonitoramento,
            modo: 'rapido',
          },
        }).then(({ data, error }) => {
          if (error || !data?.success) {
            toast({
              title: '⚠️ Andamentos não carregados',
              description: error?.message || data?.message || data?.error || 'Abra o processo para tentar novamente',
              variant: 'destructive',
            });
          } else {
            toast({
              title: '📋 Processo atualizado',
              description: `${data?.andamentosInseridos || 0} andamentos registrados${data?.monitoramentoAtivado ? ' • monitoramento ativo' : ''}`,
            });
          }
        });
        return;
      }

      // 1. Criar processo com todos os dados importados
      const { data: novoProcesso, error: processoError } = await supabase
        .from('processos')
        .insert({
          numero_processo: processo.numero_cnj,
          parte_ativa: partesExtraidas.parte_ativa,
          parte_passiva: partesExtraidas.parte_passiva,
          advogados_partes: partesExtraidas.advogados_partes,
          tribunal_id: tribunalData?.id || null,
          tribunal_nome: processo.tribunal,
          tipo_acao_nome: processo.acao || null,
          juizo: processo.juizo || null,
          fase_processual: processo.fase_processual || null,
          link_tribunal: processo.link_tribunal || null,
          valor_causa: processo.valor_causa || null,
          valor_condenacao: processo.valor_condenacao || null,
          tipo_parte_oab: processo.parte_tipo,
          status_processual: processo.status_processual || null,
          created_by: user.id,
          status: 'em_andamento',
          data_distribuicao: processo.data_distribuicao || null
        })
        .select()
        .single();

      if (processoError) {
        console.error('[Importar] ❌ Erro ao criar processo:', processoError);
        throw processoError;
      }

      console.log('[Importar] ✅ Processo criado:', novoProcesso.id);

      // Fechar dialog imediatamente e mostrar toast
      toast({
        title: "✅ Processo importado!",
        description: "Carregando andamentos em segundo plano...",
      });

      onOpenChange(false);
      
      // Redirecionar para detalhes do processo
      navigate(`/controladoria/processos/${novoProcesso.id}`);

      // Disparar busca via Escavador em background (capa + andamentos + monitoramento opcional)
      console.log('[Importar] 📋 Disparando importação Escavador em background...');

      supabase.functions.invoke('escavador-importar-processo', {
        body: {
          processoId: novoProcesso.id,
          numeroProcesso: processo.numero_cnj,
          tenantId,
          ativarMonitoramento,
          modo: 'rapido',
        },
      }).then(({ data, error }) => {
        if (error || !data?.success) {
          console.error('[Importar] ⚠️ Erro ao carregar andamentos:', error || data);
          toast({
            title: "⚠️ Andamentos não carregados",
            description: error?.message || data?.message || data?.error || "Abra o processo para tentar novamente",
            variant: 'destructive',
          });
        } else {
          console.log('[Importar] ✅ Andamentos carregados:', data);
          toast({
            title: "📋 Andamentos carregados",
            description: `${data?.andamentosInseridos || 0} andamentos registrados${data?.monitoramentoAtivado ? ' • monitoramento ativo' : ''}`,
          });
        }
      });

    } catch (error: any) {
      console.error('[Importar] 💥 Erro:', error);
      toast({
        title: "❌ Erro ao importar",
        description: error.message || 'Não foi possível importar o processo',
        variant: 'destructive'
      });
    } finally {
      setImportando(false);
    }
  };

  if (!processo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Processo para o Sistema</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações do processo */}
          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
            <div className="font-semibold text-sm">{processo.numero_cnj}</div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{processo.tribunal_acronym}</Badge>
              <Badge variant="secondary">{processo.parte_tipo}</Badge>
            </div>
          </div>

          {/* Alerta de limite de monitoramento */}
          {limiteMonitoramentoAtingido && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Limite de monitoramento atingido ({uso.processos_monitorados}/{limites.processos_monitorados}). 
                Você pode importar o processo, mas sem monitoramento.
              </AlertDescription>
            </Alert>
          )}

          {/* Opções */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="monitoramento"
                checked={ativarMonitoramento}
                onCheckedChange={(checked) => setAtivarMonitoramento(checked as boolean)}
                disabled={limiteMonitoramentoAtingido}
              />
              <div className="flex-1 space-y-1">
                <Label 
                  htmlFor="monitoramento" 
                  className={`cursor-pointer font-medium ${limiteMonitoramentoAtingido ? 'text-muted-foreground' : ''}`}
                >
                  Ativar monitoramento diário
                </Label>
                <p className="text-sm text-muted-foreground">
                  {limiteMonitoramentoAtingido 
                    ? `Limite atingido (${uso.processos_monitorados}/${limites.processos_monitorados})`
                    : 'Receba notificações automáticas de novos andamentos'
                  }
                </p>
              </div>
            </div>

            {/* Info: Andamentos carregados automaticamente */}
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-accent/50 border border-border">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Os andamentos serão carregados automaticamente em segundo plano
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImportar}
            disabled={importando}
          >
            {importando ? 'Importando...' : 'Importar Processo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};