import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Columns3 } from "lucide-react";

export const WhatsAppKanban = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Columns3 className="h-5 w-5" />
            Kanban CRM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Pipeline visual de leads do WhatsApp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
