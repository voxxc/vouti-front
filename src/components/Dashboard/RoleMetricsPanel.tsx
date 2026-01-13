import AdminMetrics from "./Metrics/AdminMetrics";
import AdvogadoMetrics from "./Metrics/AdvogadoMetrics";
import ComercialMetrics from "./Metrics/ComercialMetrics";
import FinanceiroMetrics from "./Metrics/FinanceiroMetrics";
import AgendaMetrics from "./Metrics/AgendaMetrics";
import { Skeleton } from "@/components/ui/skeleton";

interface RoleMetricsPanelProps {
  userId?: string;
  userRole?: string;
  userName?: string;
}

const RoleMetricsPanel = ({ userId, userRole, userName }: RoleMetricsPanelProps) => {
  // Optimized: Show skeleton only when essential data is missing
  if (!userId || !userRole) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const displayName = userName || 'Usuário';

  switch (userRole) {
    case 'admin':
      return <AdminMetrics userId={userId} userName={displayName} />;
    case 'controller':
      return <AdvogadoMetrics userId={userId} userName={displayName} />;
    case 'advogado':
      return <AdvogadoMetrics userId={userId} userName={displayName} />;
    case 'comercial':
      return <ComercialMetrics userId={userId} userName={displayName} />;
    case 'financeiro':
      return <FinanceiroMetrics userId={userId} userName={displayName} />;
    case 'agenda':
      return <AgendaMetrics userId={userId} userName={displayName} isAdminView={false} />;
    default:
      return <AdvogadoMetrics userId={userId} userName={displayName} />;
  }
};

export default RoleMetricsPanel;
