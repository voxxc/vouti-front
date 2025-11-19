import { CodeBlock } from "./CodeBlock";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const edgeFunctions = [
  {
    name: "atualizar-andamentos-processos",
    description: "Atualiza andamentos de processos",
    secrets: ["JUDIT_API_KEY"]
  },
  {
    name: "buscar-andamentos-datajud",
    description: "Busca andamentos via DataJud API",
    secrets: ["DATAJUD_API_KEY"]
  },
  {
    name: "buscar-andamentos-pje",
    description: "Busca andamentos via PJE",
    secrets: ["PJE_CREDENTIALS"]
  },
  {
    name: "buscar-andamentos-projudi",
    description: "Busca andamentos via Projudi",
    secrets: ["PROJUDI_CREDENTIALS"]
  },
  {
    name: "buscar-processos-lote",
    description: "Busca processos em lote",
    secrets: []
  },
  {
    name: "create-metal-user",
    description: "Cria usuário no sistema Metal",
    secrets: []
  },
  {
    name: "create-user",
    description: "Cria novo usuário no sistema",
    secrets: []
  },
  {
    name: "delete-metal-user",
    description: "Deleta usuário do sistema Metal",
    secrets: []
  },
  {
    name: "delete-user",
    description: "Deleta usuário do sistema",
    secrets: []
  },
  {
    name: "judit-ativar-monitoramento",
    description: "Ativa monitoramento de processo via Judit",
    secrets: ["JUDIT_API_KEY"]
  },
  {
    name: "judit-buscar-por-oab",
    description: "Busca processos por OAB via Judit",
    secrets: ["JUDIT_API_KEY"]
  },
  {
    name: "judit-buscar-processo",
    description: "Busca detalhes de processo via Judit",
    secrets: ["JUDIT_API_KEY"]
  },
  {
    name: "judit-desativar-monitoramento",
    description: "Desativa monitoramento via Judit",
    secrets: ["JUDIT_API_KEY"]
  },
  {
    name: "judit-health",
    description: "Health check da API Judit",
    secrets: ["JUDIT_API_KEY"]
  },
  {
    name: "judit-webhook",
    description: "Webhook para receber atualizações Judit",
    secrets: []
  },
  {
    name: "notify-divida-deleted",
    description: "Notifica exclusão de dívida",
    secrets: []
  },
  {
    name: "save-zapi-config",
    description: "Salva configuração Z-API",
    secrets: []
  },
  {
    name: "update-metal-user",
    description: "Atualiza usuário Metal",
    secrets: []
  },
  {
    name: "update-user-password",
    description: "Atualiza senha de usuário",
    secrets: []
  },
  {
    name: "validar-credenciais-projudi",
    description: "Valida credenciais Projudi",
    secrets: ["PROJUDI_CREDENTIALS"]
  },
  {
    name: "whatsapp-connect",
    description: "Conecta com WhatsApp via Z-API",
    secrets: ["Z_API_URL", "Z_API_INSTANCE_ID", "Z_API_TOKEN"]
  },
  {
    name: "whatsapp-send-message",
    description: "Envia mensagem via WhatsApp",
    secrets: ["Z_API_URL", "Z_API_INSTANCE_ID", "Z_API_TOKEN"]
  },
  {
    name: "whatsapp-webhook",
    description: "Webhook para mensagens WhatsApp",
    secrets: []
  }
];

const convertDenoToNode = (functionName: string) => {
  return `// Node.js/Express conversion for ${functionName}
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

router.post('/${functionName}', async (req, res) => {
  try {
    // Add CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
    
    // Your business logic here
    // Convert Deno.env.get() to process.env
    // Convert Response to res.json()
    
    res.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Handle OPTIONS for CORS
router.options('/${functionName}', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.sendStatus(200);
});

export default router;`;
};

export const EdgeFunctionsTab = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Edge Functions Overview</CardTitle>
          <CardDescription>
            Total: {edgeFunctions.length} Edge Functions (Deno/TypeScript)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Todas as funções estão em <code className="bg-muted px-2 py-1 rounded">supabase/functions/[function-name]/index.ts</code>
          </p>
        </CardContent>
      </Card>

      {edgeFunctions.map((func) => (
        <Card key={func.name}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{func.name}</CardTitle>
                <CardDescription>{func.description}</CardDescription>
              </div>
              {func.secrets.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {func.secrets.map((secret) => (
                    <Badge key={secret} variant="secondary" className="text-xs">
                      {secret}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 text-sm">📁 Deno (Original)</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Arquivo: <code>supabase/functions/{func.name}/index.ts</code>
              </p>
              <div className="bg-muted p-3 rounded text-xs">
                <p>Código Deno original está em: <code>supabase/functions/{func.name}/index.ts</code></p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-sm">🔄 Node.js/Express (Convertido)</h4>
              <CodeBlock
                title={`${func.name} - Node.js/Express`}
                code={convertDenoToNode(func.name)}
                language="javascript"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
