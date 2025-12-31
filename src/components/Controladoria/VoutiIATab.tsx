import React, { useState } from 'react';
import { Bot, Sparkles, RefreshCw, AlertCircle, Loader2, Power, Zap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useVoutiIA } from '@/hooks/useVoutiIA';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VoutiIATabProps {
  processoOabId: string;
}

export const VoutiIATab: React.FC<VoutiIATabProps> = ({ processoOabId }) => {
  const {
    aiSummary,
    aiSummaryData,
    aiEnabled,
    isLoading,
    isGenerating,
    enableAndGenerateSummary,
    regenerateSummary,
    disableAi,
  } = useVoutiIA(processoOabId);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  const handleActivateClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmActivate = async () => {
    setShowConfirmDialog(false);
    await enableAndGenerateSummary();
  };

  const handleDisableClick = () => {
    setShowDisableDialog(true);
  };

  const handleConfirmDisable = async () => {
    setShowDisableDialog(false);
    await disableAi();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3 mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-medium">Vouti IA</span>
          {aiEnabled && (
            <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded flex items-center gap-1">
              <Power className="h-3 w-3" />
              Ativa
            </span>
          )}
        </div>

        {aiEnabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisableClick}
            className="text-muted-foreground hover:text-destructive"
          >
            <Power className="h-4 w-4 mr-1" />
            Desativar
          </Button>
        )}
      </div>

      {/* Conteúdo */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-1 space-y-4">
          {!aiEnabled ? (
            /* Estado: IA não ativada */
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">
                Vouti IA disponível
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Ative a Vouti IA para gerar um resumo executivo automático deste processo,
                incluindo análise das partes, situação atual e pontos de atenção.
              </p>
              <Button
                onClick={handleActivateClick}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Ativar Vouti IA
              </Button>
            </div>
          ) : isGenerating ? (
            /* Estado: Gerando resumo */
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <h3 className="font-medium text-foreground mb-2">Gerando resumo...</h3>
              <p className="text-sm text-muted-foreground">
                A IA está analisando o processo. Isso pode levar alguns segundos.
              </p>
            </div>
          ) : aiSummary ? (
            /* Estado: Resumo gerado */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Resumo gerado por IA</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateSummary}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerar
                </Button>
              </div>

              <div className="bg-card rounded-lg border p-4">
                <div
                  className="prose prose-sm max-w-none text-foreground dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: formatSummaryToHtml(aiSummary) }}
                />
              </div>

              {aiSummaryData?.generated_at && (
                <div className="text-xs text-muted-foreground text-right pt-2 border-t">
                  Atualizado em: {new Date(aiSummaryData.generated_at).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          ) : (
            /* Estado: IA ativa mas sem resumo */
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground/60 mb-3" />
              <h3 className="font-medium text-foreground mb-2">Nenhum resumo ainda</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                A IA está ativa, mas ainda não há um resumo salvo para este processo.
              </p>
              <Button variant="outline" onClick={regenerateSummary} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Gerar Resumo
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Dialog de Confirmação para Ativar */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Ativar Vouti IA para este processo?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Ao ativar a Vouti IA, o sistema irá analisar automaticamente os dados
                deste processo e gerar um resumo executivo com:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Síntese do caso</li>
                <li>Análise das partes envolvidas</li>
                <li>Situação atual do processo</li>
                <li>Pontos de atenção para o advogado</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmActivate}>
              <Zap className="h-4 w-4 mr-2" />
              Confirmar e Ativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação para Desativar */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Vouti IA?</AlertDialogTitle>
            <AlertDialogDescription>
              A IA será desativada para este processo. O resumo existente será mantido,
              mas não será atualizado automaticamente. Você pode reativar a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDisable} className="bg-destructive hover:bg-destructive/90">
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Função para formatar markdown simples em HTML
function formatSummaryToHtml(summary: string): string {
  if (!summary) return '';
  
  return summary
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc my-2">$&</ul>')
    .replace(/\n\n/g, '</p><p class="my-2">')
    .replace(/\n/g, '<br/>');
}
