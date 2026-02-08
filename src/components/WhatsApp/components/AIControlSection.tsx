import { Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWhatsAppAIControl } from "@/hooks/useWhatsAppAIControl";

interface AIControlSectionProps {
  phoneNumber: string;
  tenantId: string | null;
}

export const AIControlSection = ({ phoneNumber, tenantId }: AIControlSectionProps) => {
  const { isAIDisabled, isLoading, disableAI, enableAI, disabledAt } = useWhatsAppAIControl({
    phoneNumber,
    tenantId,
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Agente IA</span>
      </div>
      
      <div className="bg-muted/50 rounded-lg p-3 space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status:</span>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : isAIDisabled ? (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
              <User className="h-3 w-3 mr-1" />
              Humano Atendendo
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
              <Bot className="h-3 w-3 mr-1" />
              IA Respondendo
            </Badge>
          )}
        </div>
        
        {/* Data de desabilitação */}
        {isAIDisabled && disabledAt && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Desde:</span>
            <span className="text-xs text-foreground">{formatDate(disabledAt)}</span>
          </div>
        )}
        
        {/* Botão de ação */}
        {!isLoading && (
          <Button
            variant={isAIDisabled ? "default" : "outline"}
            size="sm"
            className="w-full"
            onClick={() => isAIDisabled ? enableAI() : disableAI()}
          >
            {isAIDisabled ? (
              <>
                <Bot className="h-4 w-4 mr-2" />
                Reativar Agente IA
              </>
            ) : (
              <>
                <User className="h-4 w-4 mr-2" />
                Assumir Atendimento
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
