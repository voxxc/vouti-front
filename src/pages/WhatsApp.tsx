import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { WhatsAppLayout } from "@/components/WhatsApp/WhatsAppLayout";
import { WhatsAppAccessGate } from "@/components/WhatsApp/WhatsAppAccessGate";

const WhatsApp = () => {
  const { isWhatsAppEnabled } = useTenantFeatures();

  if (!isWhatsAppEnabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">WhatsApp não habilitado</h1>
          <p className="text-muted-foreground">
            O módulo WhatsApp não está disponível para este tenant.
          </p>
          <Button variant="outline" onClick={() => window.close()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <WhatsAppAccessGate>
      <WhatsAppLayout />
    </WhatsAppAccessGate>
  );
};

export default WhatsApp;
