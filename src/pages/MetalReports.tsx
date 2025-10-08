import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMetalAuth } from "@/contexts/MetalAuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Factory } from "lucide-react";
import { MetalMetricsCards } from "@/components/Metal/Reports/MetalMetricsCards";
import { StatusDistributionChart } from "@/components/Metal/Reports/StatusDistributionChart";
import { SetorDistributionChart } from "@/components/Metal/Reports/SetorDistributionChart";
import { AverageTimeBySetorChart } from "@/components/Metal/Reports/AverageTimeBySetorChart";
import { SetorPerformanceTable } from "@/components/Metal/Reports/SetorPerformanceTable";

const MetalReports = () => {
  const { user, isAdmin } = useMetalAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/metal-auth');
      return;
    }

    if (!isAdmin) {
      navigate('/metal-dashboard');
      return;
    }
  }, [user, isAdmin, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="h-16 border-b border-slate-700 bg-slate-900/90 backdrop-blur">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/metal-dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Factory className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Relatórios de Produção</h1>
                <p className="text-xs text-slate-400">Dashboard analítico MetalSystem</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* Metrics Cards */}
        <MetalMetricsCards />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatusDistributionChart />
          <SetorDistributionChart />
        </div>

        {/* Average Time Chart */}
        <AverageTimeBySetorChart />

        {/* Performance Table */}
        <SetorPerformanceTable />
      </main>
    </div>
  );
};

export default MetalReports;
