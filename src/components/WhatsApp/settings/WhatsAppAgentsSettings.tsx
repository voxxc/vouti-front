import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users2 } from "lucide-react";

export const WhatsAppAgentsSettings = () => {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agentes</h1>
          <p className="text-muted-foreground">Gerencie os agentes e suas configurações individuais</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5" />
              Gerenciamento de Agentes
            </CardTitle>
            <CardDescription>
              Cada agente pode ter sua própria configuração Z-API
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
