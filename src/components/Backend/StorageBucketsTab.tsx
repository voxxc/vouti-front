import { CodeBlock } from "./CodeBlock";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const buckets = [
  {
    name: "task-files",
    description: "Arquivos de tasks do sistema de projetos",
    public: false,
    estimatedFiles: "~500",
    estimatedSize: "~2GB"
  },
  {
    name: "avatars",
    description: "Fotos de perfil de usuários",
    public: true,
    estimatedFiles: "~50",
    estimatedSize: "~50MB"
  },
  {
    name: "processo-documentos",
    description: "Documentos de processos jurídicos",
    public: false,
    estimatedFiles: "~1000",
    estimatedSize: "~5GB"
  },
  {
    name: "cliente-documentos",
    description: "Documentos de clientes",
    public: false,
    estimatedFiles: "~300",
    estimatedSize: "~1GB"
  },
  {
    name: "comprovantes-pagamento",
    description: "Comprovantes de pagamento de parcelas",
    public: false,
    estimatedFiles: "~200",
    estimatedSize: "~500MB"
  },
  {
    name: "reuniao-cliente-attachments",
    description: "Anexos de clientes de reuniões",
    public: false,
    estimatedFiles: "~100",
    estimatedSize: "~300MB"
  },
  {
    name: "reuniao-attachments",
    description: "Anexos de reuniões",
    public: false,
    estimatedFiles: "~150",
    estimatedSize: "~400MB"
  },
  {
    name: "message-attachments",
    description: "Anexos de mensagens internas",
    public: false,
    estimatedFiles: "~80",
    estimatedSize: "~200MB"
  },
  {
    name: "tribunal-certificates",
    description: "Certificados de tribunais",
    public: false,
    estimatedFiles: "~20",
    estimatedSize: "~50MB"
  },
  {
    name: "op-fichas-tecnicas",
    description: "Fichas técnicas do sistema Metal",
    public: false,
    estimatedFiles: "~100",
    estimatedSize: "~300MB"
  },
  {
    name: "lead-attachments",
    description: "Anexos de leads",
    public: false,
    estimatedFiles: "~50",
    estimatedSize: "~100MB"
  }
];

export const StorageBucketsTab = () => {
  const downloadCommand = `# Download todos os buckets do Supabase
npx supabase storage download --all

# Ou baixar bucket específico
npx supabase storage download --bucket task-files

# Alternativa: CLI com API
curl -X GET \\
  'https://ietjmyrelhijxyozcequ.supabase.co/storage/v1/object/list/task-files' \\
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \\
  -H "apikey: YOUR_ANON_KEY"`;

  const migrationCode = `// Exemplo: Upload para VPS/MinIO
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const s3Client = new S3Client({
  endpoint: 'http://your-vps-ip:9000', // MinIO endpoint
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'YOUR_MINIO_ACCESS_KEY',
    secretAccessKey: 'YOUR_MINIO_SECRET_KEY'
  },
  forcePathStyle: true
});

async function uploadFile(bucketName: string, filePath: string, key: string) {
  const fileContent = fs.readFileSync(filePath);
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileContent
  });

  await s3Client.send(command);
  console.log(\`Uploaded: \${key} to \${bucketName}\`);
}

// Criar buckets no MinIO
const buckets = ${JSON.stringify(buckets.map(b => b.name), null, 2)};

// Upload files
for (const bucket of buckets) {
  await uploadFile(bucket, './downloaded-files/file.pdf', 'file.pdf');
}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Storage Buckets Overview</CardTitle>
          <CardDescription>
            Total: {buckets.length} buckets no Supabase Storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Estimativa total: ~10GB de arquivos distribuídos em {buckets.length} buckets
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {buckets.map((bucket) => (
          <Card key={bucket.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{bucket.name}</CardTitle>
                  <CardDescription>{bucket.description}</CardDescription>
                </div>
                <Badge variant={bucket.public ? "default" : "secondary"}>
                  {bucket.public ? "Público" : "Privado"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>📁 {bucket.estimatedFiles} arquivos</span>
                <span>💾 {bucket.estimatedSize}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CodeBlock
        title="Comandos para Download (Supabase CLI)"
        code={downloadCommand}
        language="bash"
      />

      <CodeBlock
        title="Código de Migração (MinIO/S3 no VPS)"
        code={migrationCode}
        language="typescript"
      />
    </div>
  );
};
