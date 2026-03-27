import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Workflow, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const WhatsAppN8NSettings = () => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const payloadExample = JSON.stringify({
    phone: "5511999999999",
    message: "Texto da mensagem recebida",
    contact_name: "Nome do contato",
    timestamp: "2026-03-27T12:00:00Z",
    agent_id: "uuid-do-agente",
  }, null, 2);

  const copyPayload = () => {
    navigator.clipboard.writeText(payloadExample);
    setCopied(true);
    toast.success("Payload copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integração N8N</h1>
          <p className="text-muted-foreground">Configure webhooks para conectar com workflows do N8N</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Webhook de Entrada (N8N → CRM)
            </CardTitle>
            <CardDescription>
              Configure a URL do webhook do N8N que será chamada quando uma mensagem for recebida.
              Use o passo "webhook" nos seus workflows de bot para disparar automações no N8N.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL do Webhook N8N</Label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://seu-n8n.app/webhook/abc123"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cole aqui a URL do nó "Webhook" do seu workflow N8N
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payload de exemplo</CardTitle>
            <CardDescription>
              O CRM enviará este formato de dados para o webhook do N8N
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto font-mono">
                {payloadExample}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={copyPayload}
              >
                {copied ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como usar</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Crie um workflow no N8N com um nó <strong>Webhook</strong> como trigger</li>
              <li>Copie a URL do webhook e cole no campo acima</li>
              <li>No CRM, vá em <strong>Bots → Seu Workflow → Passos</strong></li>
              <li>Adicione um passo do tipo <strong>"Chamar webhook"</strong> com a mesma URL</li>
              <li>O N8N receberá os dados da conversa e poderá executar ações externas</li>
            </ol>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button variant="outline" className="gap-2" asChild>
            <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Documentação N8N Webhooks
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};
