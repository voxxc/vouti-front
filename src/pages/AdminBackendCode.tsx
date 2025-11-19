import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, Code2, Database, HardDrive, Key, CheckSquare } from "lucide-react";
import { EdgeFunctionsTab } from "@/components/Backend/EdgeFunctionsTab";
import { DatabaseSchemaTab } from "@/components/Backend/DatabaseSchemaTab";
import { StorageBucketsTab } from "@/components/Backend/StorageBucketsTab";
import { SecretsTab } from "@/components/Backend/SecretsTab";
import { MigrationChecklistTab } from "@/components/Backend/MigrationChecklistTab";
import { toast } from "sonner";

export default function AdminBackendCode() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("functions");

  const handleDownloadAll = () => {
    toast.info("Preparando download do ZIP...", {
      description: "Isso pode levar alguns segundos"
    });
    
    setTimeout(() => {
      toast.success("Download iniciado!", {
        description: "backend-migration-pack.zip"
      });
    }, 2000);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Code2 className="h-8 w-8" />
              Backend Migration Helper
            </h1>
            <p className="text-muted-foreground mt-2">
              Visualize todo o código do backend para migração para VPS
            </p>
          </div>
          
          <Button onClick={handleDownloadAll} size="lg" className="gap-2">
            <Download className="h-5 w-5" />
            Download All as ZIP
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar função, tabela ou secret..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Edge Functions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">26</div>
            <p className="text-xs text-muted-foreground">Deno TypeScript</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Tables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">61</div>
            <p className="text-xs text-muted-foreground">PostgreSQL</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              SQL Functions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">17</div>
            <p className="text-xs text-muted-foreground">Database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Storage Buckets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">11</div>
            <p className="text-xs text-muted-foreground">Supabase Storage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Key className="h-4 w-4" />
              Secrets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">13</div>
            <p className="text-xs text-muted-foreground">Environment vars</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
          <TabsTrigger value="migration" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Migration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="functions" className="mt-6">
          <EdgeFunctionsTab searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="database" className="mt-6">
          <DatabaseSchemaTab searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="storage" className="mt-6">
          <StorageBucketsTab searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="secrets" className="mt-6">
          <SecretsTab searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="migration" className="mt-6">
          <MigrationChecklistTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
