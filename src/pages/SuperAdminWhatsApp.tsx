import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { SuperAdminWhatsAppLayout } from "@/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Logo from "@/components/Logo";

const SuperAdminWhatsApp = () => {
  const { isSuperAdmin, loading, session } = useSuperAdmin();
  const navigate = useNavigate();

  // Se não está autenticado, redireciona para login do super admin
  useEffect(() => {
    if (!loading && !session) {
      navigate("/super-admin");
    }
  }, [loading, session, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse">
            <Logo size="lg" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
          <Button variant="outline" onClick={() => window.close()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return <SuperAdminWhatsAppLayout />;
};

export default SuperAdminWhatsApp;
