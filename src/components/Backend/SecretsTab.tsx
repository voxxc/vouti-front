import { CodeBlock } from "./CodeBlock";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

const secrets = [
  {
    name: "SUPABASE_URL",
    usage: "URL do projeto Supabase",
    required: true,
    example: "https://ietjmyrelhijxyozcequ.supabase.co"
  },
  {
    name: "SUPABASE_ANON_KEY",
    usage: "Chave pública do Supabase",
    required: true,
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    usage: "Chave de serviço (admin) do Supabase",
    required: true,
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  {
    name: "JUDIT_API_KEY",
    usage: "API Key do Judit.io para busca de processos",
    required: true,
    example: "393d8ece-7925-4554-8d39-d514956d12b2"
  },
  {
    name: "Z_API_URL",
    usage: "URL da instância Z-API para WhatsApp",
    required: false,
    example: "https://api.z-api.io"
  },
  {
    name: "Z_API_INSTANCE_ID",
    usage: "ID da instância Z-API",
    required: false,
    example: "instance-12345"
  },
  {
    name: "Z_API_TOKEN",
    usage: "Token de autenticação Z-API",
    required: false,
    example: "abc123def456"
  },
  {
    name: "DATAJUD_API_KEY",
    usage: "Chave API DataJud (CNJ)",
    required: false,
    example: "datajud-key-123"
  },
  {
    name: "PJE_CREDENTIALS",
    usage: "Credenciais PJE (JSON)",
    required: false,
    example: '{"username": "user", "password": "pass"}'
  },
  {
    name: "PROJUDI_CREDENTIALS",
    usage: "Credenciais Projudi (JSON)",
    required: false,
    example: '{"username": "user", "password": "pass"}'
  },
  {
    name: "DOCKERHUB_USERNAME",
    usage: "Username do Docker Hub para CI/CD",
    required: false,
    example: "myusername"
  },
  {
    name: "HOSTINGER_HOST",
    usage: "Host do VPS Hostinger",
    required: false,
    example: "123.45.67.89"
  },
  {
    name: "HOSTINGER_PASSWORD",
    usage: "Senha SSH do VPS",
    required: false,
    example: "***"
  }
];

export const SecretsTab = () => {
  const envExample = `# .env.example - NÃO COMMITAR VALORES REAIS!

# Supabase (obrigatório)
SUPABASE_URL=https://ietjmyrelhijxyozcequ.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Judit.io API (obrigatório para Controladoria)
JUDIT_API_KEY=your_judit_api_key_here

# Z-API WhatsApp (opcional)
Z_API_URL=https://api.z-api.io
Z_API_INSTANCE_ID=your_instance_id
Z_API_TOKEN=your_token_here

# APIs de Tribunais (opcional)
DATAJUD_API_KEY=your_datajud_key
PJE_CREDENTIALS={"username":"user","password":"pass"}
PROJUDI_CREDENTIALS={"username":"user","password":"pass"}

# CI/CD (opcional)
DOCKERHUB_USERNAME=your_dockerhub_username
HOSTINGER_HOST=123.45.67.89
HOSTINGER_PASSWORD=your_ssh_password`;

  const vpsSetup = `# Setup de secrets no VPS

# 1. Criar arquivo .env
nano /var/www/jusoffice/.env

# 2. Adicionar todas as variáveis do .env.example

# 3. Para Edge Functions (se usar Node.js):
export SUPABASE_URL="https://ietjmyrelhijxyozcequ.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_key"
export JUDIT_API_KEY="your_key"

# 4. Adicionar ao .bashrc ou .profile para persistir
echo 'export SUPABASE_URL="..."' >> ~/.bashrc`;

  return (
    <div className="space-y-6">
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-amber-700 dark:text-amber-400">
              ⚠️ SEGURANÇA: Valores NÃO Exibidos
            </CardTitle>
          </div>
          <CardDescription>
            Os valores reais dos secrets nunca são exibidos por segurança. Esta aba mostra apenas os nomes e uso.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables Overview</CardTitle>
          <CardDescription>
            Total: {secrets.length} secrets e variáveis de ambiente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {secrets.map((secret) => (
              <div
                key={secret.name}
                className="flex items-start justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono font-semibold">
                      {secret.name}
                    </code>
                    {secret.required && (
                      <Badge variant="destructive" className="text-xs">
                        Obrigatório
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {secret.usage}
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    Exemplo: {secret.example}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <CodeBlock
        title=".env.example - Template para VPS"
        code={envExample}
        language="bash"
      />

      <CodeBlock
        title="Setup de Secrets no VPS"
        code={vpsSetup}
        language="bash"
      />
    </div>
  );
};
