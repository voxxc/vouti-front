import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersRound } from "lucide-react";

export const WhatsAppTeamsSettings = () => {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Times</h1>
          <p className="text-muted-foreground">Organize os agentes em times de atendimento</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5" />
              Gerenciamento de Times
            </CardTitle>
            <CardDescription>
              Crie e gerencie grupos de agentes para atendimento
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
