import { Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";

interface WhatsAppAccessDeniedProps {
  userEmail?: string | null;
}

export const WhatsAppAccessDenied = ({ userEmail }: WhatsAppAccessDeniedProps) => {
  const { tenantPath } = useTenantNavigation();

  const handleBack = () => {
    window.location.href = tenantPath('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Acesso Restrito
          </h1>
          <p className="text-muted-foreground">
            Você não possui permissão para acessar o Vouti.CRM
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            Para obter acesso, solicite ao administrador do seu escritório que cadastre 
            seu email como agente autorizado nas configurações do Vouti.CRM.
          </p>
        </div>

        {userEmail && (
          <div className="text-sm">
            <span className="text-muted-foreground">Email atual: </span>
            <span className="font-medium text-foreground">{userEmail}</span>
          </div>
        )}

        <Button 
          variant="outline" 
          onClick={handleBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Button>
      </div>
    </div>
  );
};
