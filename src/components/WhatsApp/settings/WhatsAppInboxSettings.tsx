import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox } from "lucide-react";

export const WhatsAppInboxSettings = () => {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Caixas de Entrada</h1>
          <p className="text-muted-foreground">Gerencie as instâncias de WhatsApp conectadas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Instâncias WhatsApp
            </CardTitle>
            <CardDescription>
              Configure e gerencie suas caixas de entrada
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
