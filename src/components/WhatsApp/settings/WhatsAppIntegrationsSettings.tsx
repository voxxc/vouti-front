import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug } from "lucide-react";

export const WhatsAppIntegrationsSettings = () => {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
          <p className="text-muted-foreground">Configure integrações externas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Integrações Disponíveis
            </CardTitle>
            <CardDescription>
              Conecte com serviços externos e APIs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Em desenvolvimento...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
