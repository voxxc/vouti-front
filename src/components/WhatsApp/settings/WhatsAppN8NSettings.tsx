import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Workflow } from "lucide-react";

export const WhatsAppN8NSettings = () => {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">N8N</h1>
          <p className="text-muted-foreground">Integre com workflows do N8N</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Integração N8N
            </CardTitle>
            <CardDescription>
              Configure webhooks e automações com N8N
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
