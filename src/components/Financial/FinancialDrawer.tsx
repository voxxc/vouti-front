import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { DollarSign, ArrowLeft } from "lucide-react";
import { FinancialContent, ClienteFinanceiro } from "./FinancialContent";
import { FinancialMetrics } from "./FinancialMetrics";
import { ClienteFinanceiroDialog } from "./ClienteFinanceiroDialog";

interface FinancialDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DrawerView = 'lista' | 'metricas' | 'detalhes';

export function FinancialDrawer({ open, onOpenChange }: FinancialDrawerProps) {
  const [view, setView] = useState<DrawerView>('lista');
  const [selectedCliente, setSelectedCliente] = useState<ClienteFinanceiro | null>(null);

  // Reset view when drawer closes
  useEffect(() => {
    if (!open) {
      setView('lista');
      setSelectedCliente(null);
    }
  }, [open]);

  const handleNavigateMetrics = () => setView('metricas');

  const handleViewCliente = (cliente: ClienteFinanceiro) => {
    setSelectedCliente(cliente);
    setView('detalhes');
  };

  const handleBack = () => {
    if (view === 'detalhes') {
      setSelectedCliente(null);
    }
    setView('lista');
  };

  const getTitle = () => {
    switch (view) {
      case 'metricas':
        return 'Indicadores';
      case 'detalhes':
        return selectedCliente?.nome_pessoa_fisica || selectedCliente?.nome_pessoa_juridica || 'Detalhes';
      default:
        return 'Financeiro';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent 
        side="inset"
        className="p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <SheetTitle className="sr-only">Financeiro</SheetTitle>
        
        {/* Header dinâmico — glass surface estilo Apple */}
        <div className="glass-surface flex items-center gap-3 px-6 py-4 border-b border-border/60 sticky top-0 z-10">
          {view !== 'lista' && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="h-8 w-8 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary">
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="apple-h1 text-lg md:text-xl">{getTitle()}</span>
            {view === 'lista' && (
              <span className="apple-subtitle">Clientes, colaboradores e custos</span>
            )}
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {view === 'lista' && (
              <FinancialContent 
                onNavigateMetrics={handleNavigateMetrics}
                onViewCliente={handleViewCliente}
              />
            )}

            {view === 'metricas' && <FinancialMetrics />}

            {view === 'detalhes' && selectedCliente && (
              <ClienteFinanceiroDialog
                cliente={selectedCliente}
                open={true}
                onOpenChange={(isOpen) => {
                  if (!isOpen) handleBack();
                }}
                onUpdate={() => {
                  // Reload will happen when going back to lista
                }}
                embedded
              />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
