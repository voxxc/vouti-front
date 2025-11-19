import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CodeBlock } from "./CodeBlock";
import { AlertTriangle, Code } from "lucide-react";

interface SecretsTabProps {
  searchQuery: string;
}

interface Secret {
  name: string;
  usedIn: string[];
  description: string;
  example: string;
}

const secrets: Secret[] = [
  {
    name: "JUDIT_API_KEY",
    usedIn: [
      "judit-buscar-por-oab",
      "judit-buscar-processo",
      "judit-ativar-monitoramento",
      "judit-desativar-monitoramento"
    ],
    description: "Chave de API da Judit.io para consultas processuais",
    example: "393d8ece-7925-4554-8d39-d514956d12b2"
  },
  {
    name: "Z_API_URL",
    usedIn: ["whatsapp-send-message", "whatsapp-connect", "save-zapi-config"],
    description: "URL base da instância Z-API",
    example: "https://api.z-api.io/instances/INSTANCE_ID"
  },
  {
    name: "Z_API_INSTANCE_ID",
    usedIn: ["whatsapp-send-message", "whatsapp-webhook"],
    description: "ID da instância Z-API",
    example: "3C08A91F4E1D"
  },
  {
    name: "Z_API_TOKEN",
    usedIn: ["whatsapp-send-message", "whatsapp-connect", "whatsapp-webhook"],
    description: "Token de autenticação Z-API",
    example: "A1B2C3D4E5F6"
  },
  {
    name: "EVOLUTION_API_URL",
    usedIn: ["whatsapp-webhook"],
    description: "URL da API Evolution (alternativa WhatsApp)",
    example: "https://evolution-api.com/instances/YOUR_INSTANCE"
  },
  {
    name: "EVOLUTION_API_KEY",
    usedIn: ["whatsapp-webhook"],
    description: "Chave de API da Evolution",
    example: "evo_1234567890abcdef"
  },
  {
    name: "ESCAVADOR_API_TOKEN",
    usedIn: ["escavador-ativar-e-buscar", "escavador-webhook", "escavador-consulta-recorrente"],
    description: "Token de API do Escavador (desabilitado)",
    example: "esc_token_example"
  },
  {
    name: "RESEND_API_KEY",
    usedIn: ["notify-divida-deleted"],
    description: "Chave de API do Resend para envio de emails",
    example: "re_1234567890"
  },
  {
    name: "SUPABASE_URL",
    usedIn: ["Todas as Edge Functions"],
    description: "URL do projeto Supabase",
    example: "https://ietjmyrelhijxyozcequ.supabase.co"
  },
  {
    name: "SUPABASE_ANON_KEY",
    usedIn: ["Todas as Edge Functions (client-side)"],
    description: "Chave anônima pública do Supabase",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    usedIn: ["create-user", "delete-user", "update-user-password", "create-metal-user", "delete-metal-user"],
    description: "Chave de service role (admin) do Supabase",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  {
    name: "SUPABASE_DB_URL",
    usedIn: ["Migrações e conexão direta ao banco"],
    description: "String de conexão PostgreSQL",
    example: "postgresql://postgres:[YOUR-PASSWORD]@db.ietjmyrelhijxyozcequ.supabase.co:5432/postgres"
  },
  {
    name: "SUPABASE_PUBLISHABLE_KEY",
    usedIn: ["Frontend React"],
    description: "Chave pública do Supabase (mesmo que ANON_KEY)",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
];

export function SecretsTab({ searchQuery }: SecretsTabProps) {
  const filteredSecrets = secrets.filter(secret =>
    secret.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    secret.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    secret.usedIn.some(func => func.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>⚠️ Segurança</AlertTitle>
        <AlertDescription>
          Esta página NÃO exibe valores reais dos secrets por segurança. 
          Você deve copiar os valores manualmente do painel do Supabase para o arquivo .env da VPS.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Arquivo .env.example
          </CardTitle>
          <CardDescription>
            Template de arquivo .env para configurar na VPS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`# Judit API
JUDIT_API_KEY=sua_chave_judit_aqui

# WhatsApp (Z-API)
Z_API_URL=https://api.z-api.io/instances/SUA_INSTANCIA
Z_API_INSTANCE_ID=seu_instance_id
Z_API_TOKEN=seu_token_zapi

# WhatsApp (Evolution API - alternativo)
EVOLUTION_API_URL=https://sua_instancia_evolution
EVOLUTION_API_KEY=sua_chave_evolution

# Email (Resend)
RESEND_API_KEY=re_sua_chave_resend

# Database (PostgreSQL na VPS)
DATABASE_URL=postgresql://postgres:senha@localhost:5432/jusoffice

# JWT Secret (gerar novo)
JWT_SECRET=gerar_string_aleatoria_segura_aqui

# Porta da API
PORT=3000

# Escavador (opcional - desabilitado)
# ESCAVADOR_API_TOKEN=seu_token_escavador`}
            language="bash"
            title=".env.example"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Secrets e Variáveis de Ambiente</CardTitle>
          <CardDescription>
            Total de {secrets.length} secrets configurados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Secret Name</TableHead>
                <TableHead className="font-semibold">Descrição</TableHead>
                <TableHead className="font-semibold">Usado em</TableHead>
                <TableHead className="font-semibold">Exemplo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSecrets.map((secret) => (
                <TableRow key={secret.name}>
                  <TableCell className="font-mono font-medium">{secret.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {secret.description}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {secret.usedIn.slice(0, 3).map(func => (
                        <Badge key={func} variant="outline" className="text-xs">
                          {func}
                        </Badge>
                      ))}
                      {secret.usedIn.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{secret.usedIn.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {secret.example}
                    </code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredSecrets.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum secret encontrado para "{searchQuery}"
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
