import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { WhatsAppAccessGate } from "@/components/WhatsApp/WhatsAppAccessGate";
import { WhatsAppLayout } from "@/components/WhatsApp/WhatsAppLayout";
import { Loader2 } from "lucide-react";

const CrmApp = () => {
  const navigate = useNavigate();
  const { tenant } = useParams<{ tenant: string }>();
  const [authChecked, setAuthChecked] = useState(false);
  const { tenantId, loading: tenantLoading } = useTenantId();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate(`/crm/${tenant}`, { replace: true });
      } else {
        setAuthChecked(true);
      }
    });
  }, [navigate, tenant]);

  if (!authChecked || tenantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Erro</h1>
          <p className="text-muted-foreground">Não foi possível identificar seu tenant. Contate o administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <WhatsAppAccessGate>
      <WhatsAppLayout />
    </WhatsAppAccessGate>
  );
};

export default CrmApp;
