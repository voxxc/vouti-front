import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [importando, setImportando] = useState(false);
  const [ativarMonitoramento, setAtivarMonitoramento] = useState(true);
  const [importarAndamentos, setImportarAndamentos] = useState(true);

  const handleImportar = async () => {
    if (!processo) return;

    setImportando(true);
    
    try {
      console.log('[Importar] 🔄 Iniciando importação:', processo.numero_cnj);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

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

      // 2. Importar andamentos se selecionado
      if (importarAndamentos && processo.ultimos_andamentos.length > 0) {
        const andamentosParaInserir = processo.ultimos_andamentos.map(andamento => ({
          processo_id: novoProcesso.id,
          descricao: andamento.descricao,
          tipo_movimentacao: andamento.tipo_movimentacao,
          data_movimentacao: andamento.data_movimentacao || new Date().toISOString(),
          dados_completos: andamento.dados_completos,
          lida: true // Marcamos como lida pois já foram visualizados
        }));

        const { error: andamentosError } = await supabase
          .from('processo_andamentos_judit')
          .insert(andamentosParaInserir);

        if (andamentosError) {
          console.error('[Importar] ⚠️ Erro ao importar andamentos:', andamentosError);
          // Não falhar a importação por causa disso
        } else {
          console.log('[Importar] ✅ Andamentos importados:', andamentosParaInserir.length);
        }
      }

      // 3. Ativar monitoramento se selecionado
      if (ativarMonitoramento) {
        console.log('[Importar] 🔔 Ativando monitoramento...');
        
        const { error: monitoramentoError } = await supabase.functions.invoke(
          'judit-ativar-monitoramento',
          {
            body: {
              processoId: novoProcesso.id,
              numeroProcesso: processo.numero_cnj
            }
          }
        );

        if (monitoramentoError) {
          console.error('[Importar] ⚠️ Erro ao ativar monitoramento:', monitoramentoError);
          // Não falhar a importação por causa disso
          toast({
            title: "⚠️ Processo importado com aviso",
            description: "Processo criado, mas não foi possível ativar o monitoramento automático",
          });
        } else {
          console.log('[Importar] ✅ Monitoramento ativado');
        }
      }

      toast({
        title: "✅ Processo importado!",
        description: `Processo ${processo.numero_cnj} importado com sucesso`,
      });

      onOpenChange(false);
      
      // Redirecionar para detalhes do processo
      navigate(`/controladoria/processos/${novoProcesso.id}`);

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

          {/* Opções */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="monitoramento"
                checked={ativarMonitoramento}
                onCheckedChange={(checked) => setAtivarMonitoramento(checked as boolean)}
              />
              <div className="flex-1 space-y-1">
                <Label htmlFor="monitoramento" className="cursor-pointer font-medium">
                  Ativar monitoramento diário
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receba notificações automáticas de novos andamentos
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="andamentos"
                checked={importarAndamentos}
                onCheckedChange={(checked) => setImportarAndamentos(checked as boolean)}
              />
              <div className="flex-1 space-y-1">
                <Label htmlFor="andamentos" className="cursor-pointer font-medium">
                  Importar andamentos históricos
                </Label>
                <p className="text-sm text-muted-foreground">
                  {processo.ultimos_andamentos.length} andamento(s) disponíveis
                </p>
              </div>
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
