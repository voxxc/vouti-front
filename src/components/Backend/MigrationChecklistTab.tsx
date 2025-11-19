import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { CodeBlock } from "./CodeBlock";

const checklistSteps = [
  {
    category: "🖥️ Preparação do VPS",
    steps: [
      "Contratar VPS Hostinger (ou similar) com pelo menos 4GB RAM",
      "Instalar Ubuntu 22.04 LTS ou Debian 11",
      "Configurar SSH com chave pública",
      "Instalar Docker e Docker Compose",
      "Configurar firewall (UFW) - abrir portas 80, 443, 5432, 9000"
    ]
  },
  {
    category: "🗄️ Database PostgreSQL",
    steps: [
      "Instalar PostgreSQL 15 no VPS",
      "Criar database 'jusoffice'",
      "Executar migrations SQL (61 tabelas)",
      "Criar 17 SQL functions",
      "Configurar RLS policies (~200 policies)",
      "Importar dados existentes do Supabase"
    ]
  },
  {
    category: "🔐 Storage/MinIO",
    steps: [
      "Instalar MinIO no VPS",
      "Criar 11 buckets",
      "Download de ~10GB de arquivos do Supabase Storage",
      "Upload dos arquivos para MinIO",
      "Configurar políticas de acesso nos buckets"
    ]
  },
  {
    category: "⚡ Backend API",
    steps: [
      "Escolher: Node.js/Express OU manter Deno",
      "Converter 23 Edge Functions para Node.js (se necessário)",
      "Configurar variáveis de ambiente (.env)",
      "Setup de 13 secrets (API keys, credenciais)",
      "Testar cada endpoint individualmente",
      "Configurar CORS e autenticação JWT"
    ]
  },
  {
    category: "🎨 Frontend",
    steps: [
      "Build do React (npm run build)",
      "Criar Dockerfile para frontend",
      "Subir imagem Docker para Docker Hub",
      "Configurar Nginx no VPS",
      "Atualizar SUPABASE_URL para IP do VPS",
      "Deploy e teste completo"
    ]
  },
  {
    category: "🔄 CI/CD",
    steps: [
      "Configurar GitHub Actions",
      "Setup de secrets no GitHub (HOSTINGER_HOST, etc.)",
      "Testar pipeline de deploy automático",
      "Configurar rollback strategy"
    ]
  },
  {
    category: "✅ Testes Finais",
    steps: [
      "Testar autenticação e autorização",
      "Testar upload/download de arquivos",
      "Testar Edge Functions críticas (Judit, WhatsApp)",
      "Verificar performance do banco de dados",
      "Testar backup e restore",
      "Monitorar logs por 48h"
    ]
  }
];

export const MigrationChecklistTab = () => {
  const dockerComposeExample = `# docker-compose.yml para VPS
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: jusoffice
      POSTGRES_USER: jusoffice_user
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: \${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: \${MINIO_SECRET_KEY}
    volumes:
      - ./minio-data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    restart: unless-stopped

  backend:
    image: \${DOCKERHUB_USERNAME}/jusoffice-api:latest
    environment:
      DATABASE_URL: postgresql://jusoffice_user:\${POSTGRES_PASSWORD}@postgres:5432/jusoffice
      STORAGE_ENDPOINT: http://minio:9000
      JUDIT_API_KEY: \${JUDIT_API_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - minio
    restart: unless-stopped

  frontend:
    image: \${DOCKERHUB_USERNAME}/jusoffice-front:latest
    ports:
      - "80:80"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "443:443"
    restart: unless-stopped`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Migration Checklist</CardTitle>
          <CardDescription>
            Guia completo passo-a-passo para migração Supabase → VPS Hostinger
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">Total: {checklistSteps.reduce((acc, cat) => acc + cat.steps.length, 0)} passos</Badge>
            <Badge variant="outline">{checklistSteps.length} categorias</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {checklistSteps.map((category, catIndex) => (
          <Card key={catIndex}>
            <CardHeader>
              <CardTitle className="text-lg">{category.category}</CardTitle>
              <CardDescription>
                {category.steps.length} passos nesta categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {category.steps.map((step, stepIndex) => (
                  <div
                    key={stepIndex}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Circle className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CodeBlock
        title="docker-compose.yml - Setup Completo VPS"
        code={dockerComposeExample}
        language="yaml"
      />

      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <CardTitle className="text-green-700 dark:text-green-400">
              ✅ Estimativa de Tempo
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Preparação VPS:</strong> 2-3 horas</p>
          <p><strong>Migração Database:</strong> 4-6 horas</p>
          <p><strong>Migração Storage:</strong> 3-4 horas (dependendo da internet)</p>
          <p><strong>Backend API:</strong> 8-12 horas</p>
          <p><strong>Frontend + CI/CD:</strong> 3-4 horas</p>
          <p><strong>Testes:</strong> 4-6 horas</p>
          <hr className="my-2" />
          <p className="font-bold text-base">Total estimado: 24-35 horas (3-5 dias úteis)</p>
        </CardContent>
      </Card>
    </div>
  );
};
