import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

export const WhatsAppAutomationSettings = () => {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automação</h1>
          <p className="text-muted-foreground">Configure automações para suas conversas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Regras de Automação
            </CardTitle>
            <CardDescription>
              Crie regras automáticas para otimizar o atendimento
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
