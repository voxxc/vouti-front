import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Columns3 } from "lucide-react";

export const WhatsAppKanbanSettings = () => {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kanban CRM</h1>
          <p className="text-muted-foreground">Configure as colunas e regras do seu Kanban</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Columns3 className="h-5 w-5" />
              Configurações do Kanban
            </CardTitle>
            <CardDescription>
              Personalize as etapas do seu funil de vendas
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
