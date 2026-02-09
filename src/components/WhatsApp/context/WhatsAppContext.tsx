import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";

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
  const { tenantId } = useTenantId();
  const [isAdminOrController, setIsAdminOrController] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Check if user is admin or controller
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "controller"]);

        const hasAdminRole = roleData && roleData.length > 0;
        setIsAdminOrController(hasAdminRole);

        // If not admin, get the agent ID for this user
        if (!hasAdminRole && user.email && tenantId) {
          const { data: agentData } = await supabase
            .from("whatsapp_agents")
            .select("id")
            .eq("email", user.email)
            .eq("tenant_id", tenantId)
            .eq("is_active", true)
            .maybeSingle();

          setCurrentAgentId(agentData?.id || null);
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      checkUserRole();
    }
  }, [tenantId]);

  return (
    <WhatsAppContext.Provider value={{ isAdminOrController, currentAgentId, userId, loading }}>
      {children}
    </WhatsAppContext.Provider>
  );
};
