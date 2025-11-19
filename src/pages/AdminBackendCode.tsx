import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { checkIfUserIsAdmin } from "@/lib/auth-helpers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Code2, Database, HardDrive, Key, CheckSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EdgeFunctionsTab } from "@/components/Backend/EdgeFunctionsTab";
import { DatabaseSchemaTab } from "@/components/Backend/DatabaseSchemaTab";
import { StorageBucketsTab } from "@/components/Backend/StorageBucketsTab";
import { SecretsTab } from "@/components/Backend/SecretsTab";
import { MigrationChecklistTab } from "@/components/Backend/MigrationChecklistTab";

const AdminBackendCode = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      if (!user) {
        navigate("/");
        return;
      }

      const adminStatus = await checkIfUserIsAdmin(user.id);
      if (!adminStatus) {
        toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    verifyAdmin();
  }, [user, navigate]);

  const handleDownloadAll = () => {
    setDownloading(true);
    toast.info("Preparando download... (funcionalidade em desenvolvimento)");
    
    setTimeout(() => {
      setDownloading(false);
      toast.success("Download iniciado!");
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Backend Code Viewer</h1>
            <p className="text-muted-foreground">
              Visualize todo o código backend para migração VPS
            </p>
          </div>
          <Button
            onClick={handleDownloadAll}
            disabled={downloading}
            size="lg"
            className="gap-2"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download All (ZIP)
              </>
            )}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo do Backend</CardTitle>
            <CardDescription>
              Sistema completo com Supabase (PostgreSQL + Edge Functions + Storage)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 rounded-lg border bg-card">
                <Code2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">23</p>
                <p className="text-xs text-muted-foreground">Edge Functions</p>
              </div>
              <div className="text-center p-4 rounded-lg border bg-card">
                <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">61</p>
                <p className="text-xs text-muted-foreground">Tabelas</p>
              </div>
              <div className="text-center p-4 rounded-lg border bg-card">
                <HardDrive className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">11</p>
                <p className="text-xs text-muted-foreground">Storage Buckets</p>
              </div>
              <div className="text-center p-4 rounded-lg border bg-card">
                <Key className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">13</p>
                <p className="text-xs text-muted-foreground">Secrets</p>
              </div>
              <div className="text-center p-4 rounded-lg border bg-card">
                <CheckSquare className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">40+</p>
                <p className="text-xs text-muted-foreground">Passos Migração</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="functions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="functions" className="gap-2">
            <Code2 className="h-4 w-4" />
            Edge Functions
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2">
            <HardDrive className="h-4 w-4" />
            Storage
          </TabsTrigger>
          <TabsTrigger value="secrets" className="gap-2">
            <Key className="h-4 w-4" />
            Secrets
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Checklist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="functions">
          <EdgeFunctionsTab />
        </TabsContent>

        <TabsContent value="database">
          <DatabaseSchemaTab />
        </TabsContent>

        <TabsContent value="storage">
          <StorageBucketsTab />
        </TabsContent>

        <TabsContent value="secrets">
          <SecretsTab />
        </TabsContent>

        <TabsContent value="checklist">
          <MigrationChecklistTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminBackendCode;
