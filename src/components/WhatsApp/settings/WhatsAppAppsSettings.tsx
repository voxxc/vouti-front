import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppWindow } from "lucide-react";

export const WhatsAppAppsSettings = () => {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aplicações</h1>
          <p className="text-muted-foreground">Gerencie aplicações conectadas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AppWindow className="h-5 w-5" />
              Aplicações Instaladas
            </CardTitle>
            <CardDescription>
              Gerencie apps e extensões conectadas ao sistema
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
