import { useEffect } from "react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Bell, Scale, FileStack, RefreshCw, ClipboardCheck, AlertTriangle } from "lucide-react";
import { OABManager } from "@/components/Controladoria/OABManager";
import { PushDocsManager } from "@/components/Controladoria/PushDocsManager";
import { CentralControladoria } from "@/components/Controladoria/CentralControladoria";
import { PrazosOrfaosTab } from "@/components/Controladoria/PrazosOrfaosTab";
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

        {/* Mobile: scroll horizontal compacto */}
        <div className="md:hidden -mx-1 px-1 flex overflow-x-auto snap-x snap-mandatory gap-2 pb-1">
          {kpis.map(({ label, value, icon: Icon, tint }) => (
            <div key={label} className="kpi-card !p-3 min-w-[150px] snap-start flex items-center gap-3">
              <span className={`kpi-icon shrink-0 ${tint}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] leading-tight font-medium text-muted-foreground line-clamp-2">{label}</p>
                {showSkeleton ? (
                  <Skeleton className="h-5 w-10 mt-1" />
                ) : (
                  <div className="text-lg font-semibold tracking-tight">{value}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Desktop: grid original */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-4">
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
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="apple-segmented w-max md:w-auto">
              <TabsTrigger value="central" className="text-xs md:text-sm">
                <ClipboardCheck className="mr-1.5 md:mr-2 h-4 w-4" />
                Central
              </TabsTrigger>
              <TabsTrigger value="minhas-oabs" className="text-xs md:text-sm">
                <Scale className="mr-1.5 md:mr-2 h-4 w-4" />
                OABs
              </TabsTrigger>
              <TabsTrigger value="push-doc" className="text-xs md:text-sm">
                <FileStack className="mr-1.5 md:mr-2 h-4 w-4" />
                Push-Doc
              </TabsTrigger>
              <TabsTrigger value="prazos-of" className="text-xs md:text-sm">
                <AlertTriangle className="mr-1.5 md:mr-2 h-4 w-4" />
                Prazos OF
              </TabsTrigger>
            </TabsList>
          </div>

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

          <TabsContent value="prazos-of">
            <Card>
              <CardContent className="pt-6">
                <PrazosOrfaosTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Controladoria;
