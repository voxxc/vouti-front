import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Loader2 } from "lucide-react";
import { WhatsAppAccessDenied } from "./WhatsAppAccessDenied";
import { WhatsAppAccessGranted } from "./WhatsAppAccessGranted";

interface AccessStatus {
  checking: boolean;
  hasAccess: boolean;
  accessType?: 'admin' | 'agent';
  agentId?: string;
  agentName?: string;
  agentRole?: 'admin' | 'atendente';
}

interface WhatsAppAccessGateProps {
  children: React.ReactNode;
}

export const WhatsAppAccessGate = ({ children }: WhatsAppAccessGateProps) => {
  const { tenantId } = useTenantId();
  const [status, setStatus] = useState<AccessStatus>({ checking: true, hasAccess: false });
  const [showGate, setShowGate] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, [tenantId]);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email || !tenantId) {
        setStatus({ checking: false, hasAccess: false });
        setUserEmail(user?.email || null);
        return;
      }

      setUserEmail(user.email);

      const { data, error } = await supabase.rpc('has_whatsapp_bot_access', {
        _user_email: user.email,
        _tenant_id: tenantId
      });

      if (error) {
        console.error('Erro ao verificar acesso:', error);
        setStatus({ checking: false, hasAccess: false });
        return;
      }

      if (data && data.length > 0 && data[0].has_access) {
        setStatus({
          checking: false,
          hasAccess: true,
          accessType: data[0].access_type as 'admin' | 'agent',
          agentId: data[0].agent_id,
          agentName: data[0].agent_name,
          agentRole: data[0].agent_role as 'admin' | 'atendente'
        });
      } else {
        setStatus({ checking: false, hasAccess: false });
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      setStatus({ checking: false, hasAccess: false });
    }
  };

  if (status.checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!status.hasAccess) {
    return <WhatsAppAccessDenied userEmail={userEmail} />;
  }

  if (showGate) {
    return (
      <WhatsAppAccessGranted 
        agentName={status.agentName}
        agentRole={status.agentRole}
        accessType={status.accessType}
        onContinue={() => setShowGate(false)}
      />
    );
  }

  return <>{children}</>;
};
