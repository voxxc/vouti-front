import { useState } from "react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { PerfilTab } from "@/components/Extras/PerfilTab";
import { AniversariosTab } from "@/components/Extras/AniversariosTab";
import { GoogleAgendaTab } from "@/components/Extras/GoogleAgendaTab";
import { cn } from "@/lib/utils";

type TabType = 'perfil' | 'aniversarios' | 'google-agenda';

const TabButton = ({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "pb-2 text-sm font-medium transition-colors relative",
      active
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    {children}
    {active && (
      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
    )}
  </button>
);

const Extras = () => {
  const [activeTab, setActiveTab] = useState<TabType>('perfil');

  return (
    <DashboardLayout currentPage="extras">
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Extras</h1>
          <p className="text-muted-foreground text-sm">Funcionalidades adicionais do sistema</p>
        </div>

        {/* Navegação Minimalista */}
        <div className="flex gap-6 border-b">
          <TabButton 
            active={activeTab === 'perfil'} 
            onClick={() => setActiveTab('perfil')}
          >
            Perfil
          </TabButton>
          <TabButton 
            active={activeTab === 'aniversarios'} 
            onClick={() => setActiveTab('aniversarios')}
          >
            Aniversários
          </TabButton>
          <TabButton 
            active={activeTab === 'google-agenda'} 
            onClick={() => setActiveTab('google-agenda')}
          >
            Google Agenda
          </TabButton>
        </div>

        {/* Conteúdo */}
        <div className="pt-2">
          {activeTab === 'perfil' && <PerfilTab />}
          {activeTab === 'aniversarios' && <AniversariosTab />}
          {activeTab === 'google-agenda' && <GoogleAgendaTab />}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Extras;
