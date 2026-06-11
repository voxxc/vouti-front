import { useAuth } from "@/contexts/AuthContext";

const DANIEL_EMAIL = "danieldemorais.e@gmail.com";
const SOLVENZA_TENANT_ID = "27492091-e05d-46a8-9ee8-b3b47ec894e4";

/**
 * Gate de visibilidade restrito ao Daniel de Morais no tenant Solvenza.
 * Mesmo padrão usado em ExtrasDrawer (`isDanielSolvenza`).
 */
export function useIsDaniel() {
  const { user, tenantId, loading } = useAuth();
  const isDaniel =
    user?.email?.toLowerCase() === DANIEL_EMAIL &&
    tenantId === SOLVENZA_TENANT_ID;
  return { isDaniel, loading };
}