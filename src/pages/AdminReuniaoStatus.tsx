import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { ReuniaoStatusManager } from '@/components/Reunioes/ReuniaoStatusManager';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminReuniaoStatus = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Status de Reuniões</h1>
            <p className="text-muted-foreground">
              Configure os status personalizados para o fluxo de reuniões
            </p>
          </div>
        </div>

        <ReuniaoStatusManager />
      </div>
    </DashboardLayout>
  );
};

export default AdminReuniaoStatus;
