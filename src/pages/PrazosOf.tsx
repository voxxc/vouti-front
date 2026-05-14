import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { PrazosOrfaosTab } from "@/components/Controladoria/PrazosOrfaosTab";

const PrazosOf = () => {
  return (
    <DashboardLayout currentPage="controladoria">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="kpi-icon bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))]">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h1 className="apple-h1">Prazos OF</h1>
            <p className="apple-subtitle mt-1">
              Prazos órfãos ou inconsistentes — revise manualmente e corrija para evitar perda de informação.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <PrazosOrfaosTab />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PrazosOf;