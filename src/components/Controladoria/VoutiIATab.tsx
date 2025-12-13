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
                checked={false}
                disabled={true}
                className="opacity-50 cursor-not-allowed"
              />
              <Label htmlFor="ai-toggle" className="text-sm cursor-not-allowed text-muted-foreground flex items-center gap-1">
                <Power className="w-4 h-4" />
                <span className="text-xs">(Em breve)</span>
              </Label>
            </div>
          )}
        </div>
      </div>

      {/* Conteudo do Summary */}
      <ScrollArea className="flex-1 py-4">
        <div className="px-1">
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Bot className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-foreground mb-2">Vouti IA - Em breve</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              O resumo automatico de processos estara disponivel em breve.
              Estamos trabalhando para trazer essa funcionalidade para voce.
            </p>
          </div>
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
