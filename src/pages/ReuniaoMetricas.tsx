import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { MinhasMetricasReuniao } from '@/components/Reunioes/MinhasMetricasReuniao';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';

const ReuniaoMetricas = () => {
  const { navigate } = useTenantNavigation();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reunioes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Minhas Métricas de Reuniões</h1>
            <p className="text-muted-foreground">
              Acompanhe seu desempenho e evolução
            </p>
          </div>
        </div>

        <MinhasMetricasReuniao />
      </div>
    </DashboardLayout>
  );
};

export default ReuniaoMetricas;
