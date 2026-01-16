import { useEffect } from "react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Bell, Scale, Building2, RefreshCw, ClipboardCheck } from "lucide-react";
import { OABManager } from "@/components/Controladoria/OABManager";
import { CNPJManager } from "@/components/Controladoria/CNPJManager";
import { CentralPrazos } from "@/components/Controladoria/CentralPrazos";
import { useControladoriaCache } from "@/hooks/useControladoriaCache";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import { Skeleton } from "@/components/ui/skeleton";

const Controladoria = () => {
  const { metrics, loading, isCacheLoaded, isRefreshing } = useControladoriaCache();
  const { stopLoading, navigationId } = useNavigationLoading();

  const showSkeleton = loading && !isCacheLoaded;

  // Sinalizar que a página está pronta quando cache carregar
  useEffect(() => {
    if (isCacheLoaded) {
      stopLoading(navigationId);
    }
  }, [isCacheLoaded, stopLoading, navigationId]);

  return (
    <DashboardLayout currentPage="controladoria">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Controladoria</h1>
            <p className="text-muted-foreground mt-2">Gestao e controle de processos juridicos</p>
          </div>
          {isRefreshing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Atualizando...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">Total de Processos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {showSkeleton ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{metrics.totalProcessos}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">OABs Cadastradas</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {showSkeleton ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{metrics.totalOABs}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">Processos Monitorados</CardTitle>
              <Bell className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {showSkeleton ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{metrics.monitorados}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">Push-Docs (CNPJs)</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {showSkeleton ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{metrics.totalCNPJs}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">Push-Docs Monitorados</CardTitle>
              <Bell className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {showSkeleton ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{metrics.cnpjsMonitorados}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="central" className="space-y-4">
          <TabsList>
            <TabsTrigger value="central">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Central
            </TabsTrigger>
            <TabsTrigger value="minhas-oabs">
              <Scale className="mr-2 h-4 w-4" />
              OABs
            </TabsTrigger>
            <TabsTrigger value="push-doc">
              <Building2 className="mr-2 h-4 w-4" />
              Push-Doc
            </TabsTrigger>
          </TabsList>

          <TabsContent value="central">
            <Card>
              <CardContent className="pt-6">
                <CentralPrazos />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="minhas-oabs">
            <Card>
              <CardContent className="pt-6">
                <OABManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="push-doc">
            <Card>
              <CardContent className="pt-6">
                <CNPJManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Controladoria;