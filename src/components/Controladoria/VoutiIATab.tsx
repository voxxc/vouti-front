import React from 'react';
import { useVoutiIA } from '@/hooks/useVoutiIA';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Bot, Sparkles, FileText, AlertCircle, Power } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';

interface VoutiIATabProps {
  processoOabId: string;
}

export const VoutiIATab: React.FC<VoutiIATabProps> = ({ processoOabId }) => {
  const {
    aiSummary,
    aiSummaryData,
    isLoading,
    aiEnabled,
    loadingSettings,
    isAdmin,
    toggleAiEnabled,
    refreshSummary,
  } = useVoutiIA(processoOabId);

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-400px)] min-h-[400px]">
      {/* Header com toggle */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-medium">Vouti IA</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Resumo Automatico
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Switch
                id="ai-toggle"
                checked={aiEnabled}
                onCheckedChange={toggleAiEnabled}
              />
              <Label htmlFor="ai-toggle" className="text-sm cursor-pointer">
                <Power className="w-4 h-4" />
              </Label>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshSummary}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Conteudo do Summary */}
      <ScrollArea className="flex-1 py-4">
        <div className="px-1">
          {!aiEnabled ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Bot className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium text-foreground mb-2">Vouti IA Desativado</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                O resumo automatico de processos esta desativado para este escritorio.
                {isAdmin && ' Ative o toggle acima para habilitar.'}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Carregando resumo...</p>
            </div>
          ) : aiSummary ? (
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-foreground">Resumo do Processo</h4>
                </div>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-foreground/90"
                  dangerouslySetInnerHTML={{ __html: formatSummaryToHtml(aiSummary) }}
                />
              </div>

              {/* Dados adicionais do summary */}
              {aiSummaryData && (
                <div className="space-y-3">
                  {aiSummaryData.parties && aiSummaryData.parties.length > 0 && (
                    <SummarySection title="Partes" icon={<FileText className="h-4 w-4" />}>
                      <ul className="space-y-1">
                        {aiSummaryData.parties.map((party: any, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{party.name}</span>
                            {party.role && <span className="text-xs ml-2">({party.role})</span>}
                          </li>
                        ))}
                      </ul>
                    </SummarySection>
                  )}

                  {aiSummaryData.class && (
                    <SummarySection title="Classe" icon={<FileText className="h-4 w-4" />}>
                      <p className="text-sm text-muted-foreground">{aiSummaryData.class}</p>
                    </SummarySection>
                  )}

                  {aiSummaryData.subjects && aiSummaryData.subjects.length > 0 && (
                    <SummarySection title="Assuntos" icon={<FileText className="h-4 w-4" />}>
                      <ul className="space-y-1">
                        {aiSummaryData.subjects.map((subject: string, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground">{subject}</li>
                        ))}
                      </ul>
                    </SummarySection>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium text-foreground mb-2">Resumo nao disponivel</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                O resumo automatico deste processo ainda nao foi gerado.
                Carregue os detalhes do processo na aba "Andamentos" para obter o resumo.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Componente auxiliar para secoes
const SummarySection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title,
  icon,
  children,
}) => (
  <div className="bg-muted/50 rounded-lg p-3">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h5 className="font-medium text-sm text-foreground">{title}</h5>
    </div>
    {children}
  </div>
);

// Funcao para formatar o summary em HTML
function formatSummaryToHtml(summary: string): string {
  if (!summary) return '';
  
  // Converter quebras de linha em paragrafos
  const paragraphs = summary.split(/\n\n+/);
  
  return paragraphs
    .map(p => {
      // Converter listas
      if (p.startsWith('- ') || p.startsWith('* ')) {
        const items = p.split('\n').map(line => 
          line.replace(/^[-*]\s*/, '').trim()
        ).filter(Boolean);
        return `<ul class="list-disc pl-4 space-y-1">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
      }
      
      // Converter headers
      if (p.startsWith('# ')) {
        return `<h3 class="font-semibold text-base mt-3 mb-1">${p.replace(/^#\s*/, '')}</h3>`;
      }
      if (p.startsWith('## ')) {
        return `<h4 class="font-medium text-sm mt-2 mb-1">${p.replace(/^##\s*/, '')}</h4>`;
      }
      
      // Paragrafo normal
      return `<p class="mb-2">${p.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');
}
