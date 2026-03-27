import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, ExternalLink, Info } from "lucide-react";

export const WhatsAppTypebotSettings = () => {
  const [typebotUrl, setTypebotUrl] = useState("");
  const [typebotId, setTypebotId] = useState("");

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integração Typebot</h1>
          <p className="text-muted-foreground">Conecte fluxos de conversação do Typebot ao CRM</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Configuração do Typebot
            </CardTitle>
            <CardDescription>
              Conecte sua instância do Typebot para usar fluxos visuais de conversação nos workflows de bot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL do Typebot (Self-hosted ou Cloud)</Label>
              <Input
                value={typebotUrl}
                onChange={(e) => setTypebotUrl(e.target.value)}
                placeholder="https://typebot.io ou https://seu-typebot.com"
              />
            </div>
            <div>
              <Label>ID do Fluxo (Typebot ID)</Label>
              <Input
                value={typebotId}
                onChange={(e) => setTypebotId(e.target.value)}
                placeholder="Ex: cl1a2b3c4d5e6f..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Encontre o ID no painel do Typebot → Settings → General
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" /> Como funciona
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Configure a URL e o ID do seu fluxo Typebot acima</li>
              <li>No CRM, vá em <strong>Bots → Seu Workflow → Passos</strong></li>
              <li>Adicione um passo do tipo <strong>"Chamar webhook"</strong> apontando para a API do Typebot</li>
              <li>O Typebot gerenciará o fluxo visual de conversação, retornando respostas ao CRM</li>
              <li>O contato terá uma experiência guiada de perguntas/respostas</li>
            </ol>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button variant="outline" className="gap-2" asChild>
            <a href="https://docs.typebot.io/api-reference" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Documentação Typebot API
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};
