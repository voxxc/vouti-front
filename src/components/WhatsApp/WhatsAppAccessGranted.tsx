import { CheckCircle, ArrowRight, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WhatsAppAccessGrantedProps {
  agentName?: string;
  agentRole?: 'admin' | 'atendente';
  accessType?: 'admin' | 'agent';
  onContinue: () => void;
}

export const WhatsAppAccessGranted = ({ 
  agentName, 
  agentRole, 
  accessType,
  onContinue 
}: WhatsAppAccessGrantedProps) => {
  const displayName = agentName || 'Usuário';
  const displayRole = agentRole === 'admin' ? 'Administrador' : 'Atendente';
  const isAdmin = accessType === 'admin' || agentRole === 'admin';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Acesso Autorizado
          </h1>
          <p className="text-muted-foreground">
            Você está conectado ao Vouti.CRM
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              {isAdmin ? (
                <Shield className="h-6 w-6 text-primary" />
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">{displayName}</p>
              <Badge variant={isAdmin ? "default" : "secondary"}>
                {displayRole}
              </Badge>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Você possui acesso liberado ao Vouti.CRM
          </p>
        </div>

        <Button 
          onClick={onContinue}
          className="gap-2 w-full"
          size="lg"
        >
          Acessar Vouti.CRM
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
