import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "./CodeBlock";
import { Server, Database, Code, FileText, CheckCircle2 } from "lucide-react";

export function MigrationChecklistTab() {
  return (
    <div className="space-y-6">
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Checklist Completo de Migração
          </CardTitle>
          <CardDescription>
            Siga este guia passo-a-passo para migrar todo o backend para sua VPS
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Fase 1: Preparação VPS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <CardTitle>Fase 1: Preparação da VPS</CardTitle>
            </div>
            <Badge>Infraestrutura</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox id="vps-1" />
              <div className="space-y-1">
                <label htmlFor="vps-1" className="text-sm font-medium cursor-pointer">
                  Contratar VPS (mínimo 8GB RAM, 2 vCPUs, 80GB SSD)
                </label>
                <p className="text-xs text-muted-foreground">
                  Recomendado: Ubuntu Server 22.04 LTS
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="vps-2" />
              <div className="space-y-1">
                <label htmlFor="vps-2" className="text-sm font-medium cursor-pointer">
                  Configurar firewall (UFW)
                </label>
                <CodeBlock
                  code={`sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw allow 5432/tcp # PostgreSQL (apenas localhost)
sudo ufw enable`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="vps-3" />
              <div className="space-y-1">
                <label htmlFor="vps-3" className="text-sm font-medium cursor-pointer">
                  Instalar PostgreSQL 15
                </label>
                <CodeBlock
                  code={`sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15
sudo systemctl start postgresql
sudo systemctl enable postgresql`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="vps-4" />
              <div className="space-y-1">
                <label htmlFor="vps-4" className="text-sm font-medium cursor-pointer">
                  Instalar Node.js 20 LTS
                </label>
                <CodeBlock
                  code={`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Verificar instalação`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="vps-5" />
              <div className="space-y-1">
                <label htmlFor="vps-5" className="text-sm font-medium cursor-pointer">
                  Instalar Nginx + Certbot (SSL)
                </label>
                <CodeBlock
                  code={`sudo apt install nginx certbot python3-certbot-nginx
sudo systemctl start nginx
sudo systemctl enable nginx`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fase 2: Database */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Fase 2: Migração do Banco de Dados</CardTitle>
            </div>
            <Badge variant="secondary">PostgreSQL</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox id="db-1" />
              <div className="space-y-1">
                <label htmlFor="db-1" className="text-sm font-medium cursor-pointer">
                  Exportar backup completo do Supabase
                </label>
                <CodeBlock
                  code={`# Via Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d).sql

# Ou via pg_dump direto
pg_dump "postgresql://postgres:[PASSWORD]@db.ietjmyrelhijxyozcequ.supabase.co:5432/postgres" > backup.sql`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="db-2" />
              <div className="space-y-1">
                <label htmlFor="db-2" className="text-sm font-medium cursor-pointer">
                  Criar database na VPS
                </label>
                <CodeBlock
                  code={`sudo -u postgres psql
CREATE DATABASE jusoffice;
CREATE USER jusoffice_user WITH ENCRYPTED PASSWORD 'senha_segura_aqui';
GRANT ALL PRIVILEGES ON DATABASE jusoffice TO jusoffice_user;
\\q`}
                  language="sql"
                  showLineNumbers={false}
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="db-3" />
              <div className="space-y-1">
                <label htmlFor="db-3" className="text-sm font-medium cursor-pointer">
                  Restaurar backup na VPS
                </label>
                <CodeBlock
                  code={`psql -U jusoffice_user -d jusoffice -f backup.sql`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="db-4" />
              <div className="space-y-1">
                <label htmlFor="db-4" className="text-sm font-medium cursor-pointer">
                  Testar conexão
                </label>
                <CodeBlock
                  code={`psql -U jusoffice_user -d jusoffice -c "SELECT COUNT(*) FROM processos;"`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fase 3: API Node.js */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              <CardTitle>Fase 3: Migração Edge Functions → Node.js API</CardTitle>
            </div>
            <Badge variant="secondary">Node.js + Express</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox id="api-1" />
              <div className="space-y-1">
                <label htmlFor="api-1" className="text-sm font-medium cursor-pointer">
                  Criar estrutura do projeto Node.js
                </label>
                <CodeBlock
                  code={`mkdir jusoffice-api && cd jusoffice-api
npm init -y
npm install express cors dotenv @supabase/supabase-js bcrypt jsonwebtoken
npm install -D typescript @types/node @types/express ts-node nodemon

# Criar estrutura
mkdir src src/routes src/middleware src/services
touch src/index.ts src/routes/index.ts .env`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="api-2" />
              <div className="space-y-1">
                <label htmlFor="api-2" className="text-sm font-medium cursor-pointer">
                  Copiar código Node.js das 26 Edge Functions
                </label>
                <p className="text-xs text-muted-foreground">
                  Use a tab "Edge Functions" acima para copiar cada função convertida
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="api-3" />
              <div className="space-y-1">
                <label htmlFor="api-3" className="text-sm font-medium cursor-pointer">
                  Configurar servidor Express principal
                </label>
                <CodeBlock
                  code={`// src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Importar todas as rotas
import juditRoutes from './routes/judit';
import whatsappRoutes from './routes/whatsapp';
import userRoutes from './routes/users';
// ... outras rotas

app.use('/api/judit', juditRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`🚀 API rodando na porta \${PORT}\`);
});`}
                  language="typescript"
                  showLineNumbers={false}
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="api-4" />
              <div className="space-y-1">
                <label htmlFor="api-4" className="text-sm font-medium cursor-pointer">
                  Configurar arquivo .env com todos os secrets
                </label>
                <p className="text-xs text-muted-foreground">
                  Use a tab "Secrets" acima para copiar o template .env.example
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="api-5" />
              <div className="space-y-1">
                <label htmlFor="api-5" className="text-sm font-medium cursor-pointer">
                  Testar API localmente
                </label>
                <CodeBlock
                  code={`npm run dev
# Testar endpoint
curl http://localhost:3000/api/health`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="api-6" />
              <div className="space-y-1">
                <label htmlFor="api-6" className="text-sm font-medium cursor-pointer">
                  Configurar PM2 para produção
                </label>
                <CodeBlock
                  code={`npm install -g pm2
pm2 start dist/index.js --name jusoffice-api
pm2 startup
pm2 save`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fase 4: Storage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Fase 4: Migração de Storage</CardTitle>
            </div>
            <Badge variant="secondary">MinIO / S3</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox id="storage-1" />
              <div className="space-y-1">
                <label htmlFor="storage-1" className="text-sm font-medium cursor-pointer">
                  Instalar MinIO (compatível S3)
                </label>
                <CodeBlock
                  code={`docker run -d -p 9000:9000 -p 9001:9001 \\
  --name minio \\
  -e "MINIO_ROOT_USER=admin" \\
  -e "MINIO_ROOT_PASSWORD=senha_segura" \\
  -v /mnt/storage:/data \\
  minio/minio server /data --console-address ":9001"`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="storage-2" />
              <div className="space-y-1">
                <label htmlFor="storage-2" className="text-sm font-medium cursor-pointer">
                  Baixar todos os 11 buckets do Supabase
                </label>
                <p className="text-xs text-muted-foreground">
                  Use a tab "Storage" acima para comandos específicos de cada bucket
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="storage-3" />
              <div className="space-y-1">
                <label htmlFor="storage-3" className="text-sm font-medium cursor-pointer">
                  Upload para MinIO
                </label>
                <CodeBlock
                  code={`mc alias set myminio http://localhost:9000 admin senha_segura
mc mb myminio/processo-documentos
mc mirror ./backup_storage/processo-documentos/ myminio/processo-documentos/
# Repetir para os outros 10 buckets`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fase 5: Frontend */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              <CardTitle>Fase 5: Atualização do Frontend React</CardTitle>
            </div>
            <Badge variant="secondary">React</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox id="front-1" />
              <div className="space-y-1">
                <label htmlFor="front-1" className="text-sm font-medium cursor-pointer">
                  Atualizar URLs das chamadas de API
                </label>
                <CodeBlock
                  code={`// Antes (Supabase Edge Functions)
const { data } = await supabase.functions.invoke('judit-buscar-por-oab', { body: { ... } });

// Depois (Sua VPS)
const response = await fetch('https://api.seudominio.com/api/judit/buscar-oab', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ ... })
});
const data = await response.json();`}
                  language="typescript"
                  showLineNumbers={false}
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="front-2" />
              <div className="space-y-1">
                <label htmlFor="front-2" className="text-sm font-medium cursor-pointer">
                  Configurar variável de ambiente da API
                </label>
                <CodeBlock
                  code={`// .env.production
VITE_API_URL=https://api.seudominio.com`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fase 6: Finalização */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <CardTitle>Fase 6: Testes e Go Live</CardTitle>
            </div>
            <Badge variant="secondary">Produção</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox id="final-1" />
              <label htmlFor="final-1" className="text-sm font-medium cursor-pointer">
                Testar todas as funcionalidades críticas
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="final-2" />
              <label htmlFor="final-2" className="text-sm font-medium cursor-pointer">
                Configurar SSL com Certbot
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="final-3" />
              <label htmlFor="final-3" className="text-sm font-medium cursor-pointer">
                Configurar backups automáticos (Database + Storage)
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="final-4" />
              <label htmlFor="final-4" className="text-sm font-medium cursor-pointer">
                Configurar monitoramento (Uptime, erros, performance)
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="final-5" />
              <label htmlFor="final-5" className="text-sm font-medium cursor-pointer">
                Atualizar DNS para apontar para VPS
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
