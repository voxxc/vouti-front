import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { AgendaContent } from "@/components/Agenda/AgendaContent";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { useAuth } from "@/contexts/AuthContext";

const Agenda = () => {
  const { user } = useAuth();
  const { navigate } = useTenantNavigation();
  const { stopLoading, navigationId } = useNavigationLoading();

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Signal page ready
  useEffect(() => {
    const navId = navigationId;
    if (!user) {
      stopLoading(navId);
      return;
    }
    stopLoading(navId);
  }, [user]);

  return (
    <DashboardLayout currentPage="agenda">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft size={16} />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground">Gerencie prazos e compromissos</p>
          </div>
        </div>

        {/* Shared content */}
        <AgendaContent />
      </div>
    </DashboardLayout>
  );
};

export default Agenda;
