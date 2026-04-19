import { useEffect } from "react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Bell, Scale, FileStack, RefreshCw, ClipboardCheck } from "lucide-react";
import { OABManager } from "@/components/Controladoria/OABManager";
import { PushDocsManager } from "@/components/Controladoria/PushDocsManager";
import { CentralControladoria } from "@/components/Controladoria/CentralControladoria";
import { useControladoriaCache } from "@/hooks/useControladoriaCache";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import { Skeleton } from "@/components/ui/skeleton";

const Controladoria = () => {
  const { metrics, loading, isCacheLoaded, isRefreshing } = useControladoriaCache();
  const { stopLoading, navigationId } = useNavigationLoading();

  const showSkeleton = loading && !isCacheLoaded;

  useEffect(() => {
    if (isCacheLoaded) {
      stopLoading(navigationId);
    }
  }, [isCacheLoaded, stopLoading, navigationId]);

  const kpis = [
    { label: "Total de Processos", value: metrics.totalProcessos, icon: FileText, tint: "bg-primary/10 text-primary" },
    { label: "OABs Cadastradas", value: metrics.totalOABs, icon: Scale, tint: "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]" },
    { label: "Processos Monitorados", value: metrics.monitorados, icon: Bell, tint: "bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))]" },
    { label: "Push-Docs (Documentos)", value: metrics.totalPushDocs, icon: FileStack, tint: "bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))]" },
    { label: "Push-Docs Monitorados", value: metrics.pushDocsMonitorados, icon: Bell, tint: "bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))]" },
  ];

  return (
    <DashboardLayout currentPage="controladoria">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="apple-h1">Controladoria</h1>
            <p className="apple-subtitle mt-1">Gestão e Controle de Processos Judiciais</p>
          </div>
          {isRefreshing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Atualizando...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpis.map(({ label, value, icon: Icon, tint }) => (
            <div key={label} className="kpi-card">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <span className={`kpi-icon ${tint}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              {showSkeleton ? (
                <Skeleton className="h-8 w-16 mt-2" />
              ) : (
                <div className="text-2xl font-semibold tracking-tight mt-2">{value}</div>
              )}
            </div>
          ))}
        </div>

        <Tabs defaultValue="central" className="space-y-4">
          <TabsList className="apple-segmented">
            <TabsTrigger value="central">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Central
            </TabsTrigger>
            <TabsTrigger value="minhas-oabs">
              <Scale className="mr-2 h-4 w-4" />
              OABs
            </TabsTrigger>
            <TabsTrigger value="push-doc">
              <FileStack className="mr-2 h-4 w-4" />
              Push-Doc
            </TabsTrigger>
          </TabsList>

          <TabsContent value="central">
            <Card>
              <CardContent className="pt-6">
                <CentralControladoria />
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
                <PushDocsManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Controladoria;
