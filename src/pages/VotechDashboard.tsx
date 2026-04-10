import { useState } from 'react';
import { VotechSidebar, VotechView } from '@/components/Votech/VotechSidebar';
import { VotechDashboardView } from '@/components/Votech/VotechDashboardView';
import { VotechTransacoesView } from '@/components/Votech/VotechTransacoesView';
import { VotechContasView } from '@/components/Votech/VotechContasView';
import { VotechRelatoriosView } from '@/components/Votech/VotechRelatoriosView';

const VotechDashboard = () => {
  const [activeView, setActiveView] = useState<VotechView>('dashboard');

  const renderView = () => {
    switch (activeView) {
      case 'receitas': return <VotechTransacoesView tipo="receita" />;
      case 'despesas': return <VotechTransacoesView tipo="despesa" />;
      case 'contas-pagar': return <VotechContasView tipo="pagar" />;
      case 'contas-receber': return <VotechContasView tipo="receber" />;
      case 'relatorios': return <VotechRelatoriosView />;
      default: return <VotechDashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <VotechSidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 p-8 overflow-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default VotechDashboard;
