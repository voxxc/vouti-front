import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Bell, Scale, Building2, RefreshCw } from "lucide-react";
import { OABManager } from "@/components/Controladoria/OABManager";
import { CNPJManager } from "@/components/Controladoria/CNPJManager";
import { CentralControladoria } from "@/components/Controladoria/CentralControladoria";
import { useControladoriaCache } from "@/hooks/useControladoriaCache";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type TabValue = 'central' | 'minhas-oabs' | 'push-doc';

export const ControladoriaContent = () => {
  const { metrics, loading, isCacheLoaded, isRefreshing } = useControladoriaCache();
  const [activeTab, setActiveTab] = useState<TabValue>('central');

  const showSkeleton = loading && !isCacheLoaded;

  const tabs: { value: TabValue; label: string }[] = [
    { value: 'central', label: 'Central' },
    { value: 'minhas-oabs', label: 'OABs' },
    { value: 'push-doc', label: 'Push-Doc' },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Controladoria</h1>
          <p className="text-muted-foreground mt-2">Gestão e Controle de Processos Judiciais</p>
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
            <Bell className="h-4 w-4 text-primary" />
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
            <Bell className="h-4 w-4 text-primary" />
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

      <div className="flex-1 min-h-0 flex flex-col space-y-4">
        <div className="flex gap-6 border-b flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "pb-2 text-sm font-medium transition-colors relative",
                activeTab === tab.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {activeTab === 'central' && (
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardContent className="pt-6 h-full flex flex-col">
              <CentralControladoria />
            </CardContent>
          </Card>
        )}

        {activeTab === 'minhas-oabs' && (
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardContent className="pt-6 h-full flex flex-col">
              <OABManager />
            </CardContent>
          </Card>
        )}

        {activeTab === 'push-doc' && (
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardContent className="pt-6 h-full flex flex-col">
              <CNPJManager />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
