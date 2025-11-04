import { User } from "@/types/user";
import AdminMetrics from "./Metrics/AdminMetrics";
import AdvogadoMetrics from "./Metrics/AdvogadoMetrics";
import ComercialMetrics from "./Metrics/ComercialMetrics";
import FinanceiroMetrics from "./Metrics/FinanceiroMetrics";
import AgendaMetrics from "./Metrics/AgendaMetrics";

interface RoleMetricsPanelProps {
  currentUser: User | null;
}

const RoleMetricsPanel = ({ currentUser }: RoleMetricsPanelProps) => {
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando informações do usuário...</p>
      </div>
    );
  }

  const role = currentUser.role;

  switch (role) {
    case 'admin':
      return <AdminMetrics userId={currentUser.id} />;
    case 'controller':
      return <AdvogadoMetrics userId={currentUser.id} userName={currentUser.name} />;
    case 'advogado':
      return <AdvogadoMetrics userId={currentUser.id} userName={currentUser.name} />;
    case 'comercial':
      return <ComercialMetrics userId={currentUser.id} userName={currentUser.name} />;
    case 'financeiro':
      return <FinanceiroMetrics userId={currentUser.id} userName={currentUser.name} />;
    case 'agenda':
      return <AgendaMetrics userId={currentUser.id} userName={currentUser.name} />;
    default:
      return <AdvogadoMetrics userId={currentUser.id} userName={currentUser.name} />;
  }
};

export default RoleMetricsPanel;
