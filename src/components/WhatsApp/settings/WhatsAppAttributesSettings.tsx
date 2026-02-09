import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sliders } from "lucide-react";

export const WhatsAppAttributesSettings = () => {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Atributos</h1>
          <p className="text-muted-foreground">Configure campos personalizados para contatos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5" />
              Atributos Personalizados
            </CardTitle>
            <CardDescription>
              Crie campos personalizados para armazenar informações extras
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
