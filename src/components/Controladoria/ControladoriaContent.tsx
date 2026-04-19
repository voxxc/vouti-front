import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Bell, Scale, FileStack, RefreshCw } from "lucide-react";
import { OABManager } from "@/components/Controladoria/OABManager";
import { PushDocsManager } from "@/components/Controladoria/PushDocsManager";
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

  const kpis = [
    { label: "Total de Processos", value: metrics.totalProcessos, icon: FileText, tint: "bg-primary/10 text-primary" },
    { label: "OABs Cadastradas", value: metrics.totalOABs, icon: Scale, tint: "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]" },
    { label: "Processos Monitorados", value: metrics.monitorados, icon: Bell, tint: "bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))]" },
    { label: "Push-Docs (Documentos)", value: metrics.totalPushDocs, icon: FileStack, tint: "bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))]" },
    { label: "Push-Docs Monitorados", value: metrics.pushDocsMonitorados, icon: Bell, tint: "bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))]" },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
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

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4">
        {kpis.map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className="kpi-card">
            <div className="flex items-start justify-between gap-2">
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

      <div className="flex-1 min-h-0 flex flex-col space-y-4">
        <div className="apple-tab-bar">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              data-active={activeTab === tab.value}
              className="apple-tab"
            >
              {tab.label}
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
              <PushDocsManager />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
