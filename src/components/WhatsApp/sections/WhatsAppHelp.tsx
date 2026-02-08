import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

export const WhatsAppHelp = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Central de Ajuda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Documentação e FAQ sobre o módulo WhatsApp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
