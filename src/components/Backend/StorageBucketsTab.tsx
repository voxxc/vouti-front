import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "./CodeBlock";
import { Download, Lock, Globe } from "lucide-react";
import { toast } from "sonner";

interface StorageBucketsTabProps {
  searchQuery: string;
}

interface StorageBucket {
  name: string;
  isPublic: boolean;
  description: string;
  estimatedFiles: number;
  estimatedSize: string;
}

const storageBuckets: StorageBucket[] = [
  {
    name: "processo-documentos",
    isPublic: false,
    description: "Documentos anexados aos processos judiciais",
    estimatedFiles: 1500,
    estimatedSize: "2.3 GB"
  },
  {
    name: "cliente-documentos",
    isPublic: false,
    description: "Documentos dos clientes (contratos, RG, CPF, etc)",
    estimatedFiles: 800,
    estimatedSize: "1.1 GB"
  },
  {
    name: "comprovantes-pagamento",
    isPublic: false,
    description: "Comprovantes de pagamento de clientes",
    estimatedFiles: 450,
    estimatedSize: "450 MB"
  },
  {
    name: "task-attachments",
    isPublic: false,
    description: "Anexos de tarefas nos projetos",
    estimatedFiles: 320,
    estimatedSize: "890 MB"
  },
  {
    name: "reuniao-cliente-attachments",
    isPublic: false,
    description: "Arquivos anexados aos clientes de reunião",
    estimatedFiles: 200,
    estimatedSize: "340 MB"
  },
  {
    name: "reuniao-attachments",
    isPublic: false,
    description: "Arquivos anexados às reuniões",
    estimatedFiles: 180,
    estimatedSize: "290 MB"
  },
  {
    name: "message-attachments",
    isPublic: false,
    description: "Anexos de mensagens internas",
    estimatedFiles: 150,
    estimatedSize: "210 MB"
  },
  {
    name: "tribunal-certificates",
    isPublic: false,
    description: "Certificados digitais para tribunais (Projudi, etc)",
    estimatedFiles: 12,
    estimatedSize: "5 MB"
  },
  {
    name: "op-fichas-tecnicas",
    isPublic: true,
    description: "Fichas técnicas do sistema Metal",
    estimatedFiles: 250,
    estimatedSize: "180 MB"
  },
  {
    name: "lead-attachments",
    isPublic: false,
    description: "Anexos dos leads de captação",
    estimatedFiles: 90,
    estimatedSize: "120 MB"
  },
  {
    name: "avatars",
    isPublic: true,
    description: "Fotos de perfil dos usuários",
    estimatedFiles: 45,
    estimatedSize: "15 MB"
  }
];

export function StorageBucketsTab({ searchQuery }: StorageBucketsTabProps) {
  const filteredBuckets = storageBuckets.filter(bucket =>
    bucket.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bucket.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadBucket = (bucketName: string) => {
    toast.info(`Preparando download de ${bucketName}...`, {
      description: "Isso pode levar alguns minutos"
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Instruções de Migração</CardTitle>
          <CardDescription>
            Como migrar os buckets de storage para sua VPS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Login no Supabase
supabase login

# 3. Link ao projeto
supabase link --project-ref ietjmyrelhijxyozcequ

# 4. Baixar todos os buckets (exemplo)
supabase storage cp supabase://processo-documentos/ ./backup_storage/processo-documentos/ --recursive

# 5. Na VPS, usar MinIO ou S3-compatible storage
# Exemplo com MinIO:
docker run -p 9000:9000 -p 9001:9001 \\
  -e "MINIO_ROOT_USER=admin" \\
  -e "MINIO_ROOT_PASSWORD=sua_senha" \\
  -v /mnt/storage:/data \\
  minio/minio server /data --console-address ":9001"

# 6. Upload para MinIO
mc alias set myminio http://localhost:9000 admin sua_senha
mc mb myminio/processo-documentos
mc mirror ./backup_storage/processo-documentos/ myminio/processo-documentos/`}
            language="bash"
            title="Comandos de Migração de Storage"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredBuckets.map((bucket) => (
          <Card key={bucket.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {bucket.isPublic ? (
                      <Globe className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-orange-500" />
                    )}
                    <CardTitle className="font-mono">{bucket.name}</CardTitle>
                  </div>
                  <CardDescription>{bucket.description}</CardDescription>
                </div>
                <Badge variant={bucket.isPublic ? "secondary" : "default"}>
                  {bucket.isPublic ? "Public" : "Private"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Arquivos estimados:</span>
                  <div className="font-semibold">{bucket.estimatedFiles.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Tamanho estimado:</span>
                  <div className="font-semibold">{bucket.estimatedSize}</div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Comando para download:</p>
                <CodeBlock
                  code={`supabase storage cp supabase://${bucket.name}/ ./backup_storage/${bucket.name}/ --recursive`}
                  language="bash"
                  showLineNumbers={false}
                />
              </div>

              <Button 
                onClick={() => handleDownloadBucket(bucket.name)}
                className="w-full gap-2"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                Baixar Bucket
              </Button>
            </CardContent>
          </Card>
        ))}

        {filteredBuckets.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum bucket encontrado para "{searchQuery}"
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
