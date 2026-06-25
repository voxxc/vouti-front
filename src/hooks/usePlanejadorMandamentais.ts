import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAllPaginated } from "@/lib/supabasePagination";
import { useToast } from "@/hooks/use-toast";

export interface Mandamental {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  status: "pendente" | "atribuido" | "arquivado";
  cliente_nome: string | null;
  project_id: string | null;
  created_by: string;
  assigned_to: string | null;
  deadline_id: string | null;
  atribuido_em: string | null;
  created_at: string;
  updated_at: string;
  deadline?: { id: string; date: string; completed: boolean } | null;
}

const QK = (tenantId: string | null | undefined) => ["planejador-mandamentais", tenantId] as const;

export function useMandamentais() {
  const { tenantId } = useTenantId();
  return useQuery({
    queryKey: QK(tenantId),
    enabled: !!tenantId,
    queryFn: async (): Promise<Mandamental[]> => {
      if (!tenantId) return [];
      const { data, error } = await fetchAllPaginated<Mandamental>(() =>
        (supabase as any)
          .from("planejador_mandamentais")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
      );
      if (error) throw error;
      const list = (data || []) as Mandamental[];
      const ids = Array.from(new Set(list.map((r) => r.deadline_id).filter(Boolean))) as string[];
      if (ids.length === 0) return list;
      const { data: deadlines } = await (supabase as any)
        .from("deadlines")
        .select("id,date,completed")
        .in("id", ids);
      const map = new Map<string, { id: string; date: string; completed: boolean }>();
      (deadlines || []).forEach((d: any) => map.set(d.id, d));
      return list.map((r) => ({ ...r, deadline: r.deadline_id ? map.get(r.deadline_id) || null : null }));
    },
  });
}

export function useCreateMandamental() {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { titulo: string; descricao?: string; cliente_nome?: string; project_id?: string | null }) => {
      if (!tenantId || !user) throw new Error("Sem tenant/usuário");
      const { data, error } = await (supabase as any)
        .from("planejador_mandamentais")
        .insert({
          tenant_id: tenantId,
          created_by: user.id,
          titulo: input.titulo,
          descricao: input.descricao || null,
          cliente_nome: input.cliente_nome || null,
          project_id: input.project_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Mandamental;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(tenantId) });
      toast({ title: "Mandamental criado" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao criar mandamental", description: err?.message, variant: "destructive" });
    },
  });
}

export function useUpdateMandamental() {
  const { tenantId } = useTenantId();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { id: string; titulo?: string; descricao?: string | null; cliente_nome?: string | null; project_id?: string | null }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any)
        .from("planejador_mandamentais")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(tenantId) });
      toast({ title: "Mandamental atualizado" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao atualizar", description: err?.message, variant: "destructive" });
    },
  });
}

export function useAtribuirMandamental() {
  const { tenantId } = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; userId: string; deadlineId: string }) => {
      const { error } = await (supabase as any)
        .from("planejador_mandamentais")
        .update({
          status: "atribuido",
          assigned_to: input.userId,
          deadline_id: input.deadlineId,
          atribuido_em: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(tenantId) });
    },
  });
}

export function useArquivarMandamental() {
  const { tenantId } = useTenantId();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("planejador_mandamentais")
        .update({ status: "arquivado" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(tenantId) });
      toast({ title: "Mandamental arquivado" });
    },
  });
}

export function useReabrirMandamental() {
  const { tenantId } = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("planejador_mandamentais")
        .update({ status: "pendente", assigned_to: null, deadline_id: null, atribuido_em: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(tenantId) });
    },
  });
}

export function useDeleteMandamental() {
  const { tenantId } = useTenantId();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("planejador_mandamentais")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(tenantId) });
      toast({ title: "Mandamental excluído" });
    },
  });
}