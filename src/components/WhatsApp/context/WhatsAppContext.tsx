import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface WhatsAppContextType {
  isAdminOrController: boolean;
  currentAgentId: string | null;
  userId: string | null;
  loading: boolean;
}

const WhatsAppContext = createContext<WhatsAppContextType>({
  isAdminOrController: false,
  currentAgentId: null,
  userId: null,
  loading: true,
});

export const useWhatsAppContext = () => useContext(WhatsAppContext);

interface WhatsAppProviderProps {
  children: ReactNode;
}

export const WhatsAppProvider = ({ children }: WhatsAppProviderProps) => {
  const { user, userRoles, tenantId, loading: authLoading } = useAuth();
  const [isAdminOrController, setIsAdminOrController] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const hasAdminRole = userRoles.some(r => r === 'admin' || r === 'controller');
    setIsAdminOrController(hasAdminRole);

    // If not admin, get the agent ID for this user
    if (!hasAdminRole && user.email && tenantId) {
      supabase
        .from("whatsapp_agents")
        .select("id")
        .eq("email", user.email)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .maybeSingle()
        .then(({ data: agentData }) => {
          setCurrentAgentId(agentData?.id || null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user, userRoles, tenantId, authLoading]);

  return (
    <WhatsAppContext.Provider value={{ isAdminOrController, currentAgentId, userId: user?.id || null, loading }}>
      {children}
    </WhatsAppContext.Provider>
  );
};
