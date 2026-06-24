import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAllPaginated } from "@/lib/supabasePagination";
import { useToast } from "@/hooks/use-toast";

export interface Revisional {
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

const QK = (tenantId: string | null | undefined) => ["planejador-revisionais", tenantId] as const;

export function useRevisionais() {
  const { tenantId } = useTenantId();
  return useQuery({
    queryKey: QK(tenantId),
    enabled: !!tenantId,
    queryFn: async (): Promise<Revisional[]> => {
      if (!tenantId) return [];
      const { data, error } = await fetchAllPaginated<Revisional>(() =>
        (supabase as any)
          .from("planejador_revisionais")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
      );
      if (error) throw error;
      const list = (data || []) as Revisional[];
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

export function useCreateRevisional() {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { titulo: string; descricao?: string; cliente_nome?: string; project_id?: string | null }) => {
      if (!tenantId || !user) throw new Error("Sem tenant/usuário");
      const { data, error } = await (supabase as any)
        .from("planejador_revisionais")
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
      return data as Revisional;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(tenantId) });
      toast({ title: "Revisional criado" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao criar revisional", description: err?.message, variant: "destructive" });
    },
  });
}

export function useUpdateRevisional() {
  const { tenantId } = useTenantId();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { id: string; titulo?: string; descricao?: string | null; cliente_nome?: string | null; project_id?: string | null }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any)
        .from("planejador_revisionais")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(tenantId) });
      toast({ title: "Revisional atualizado" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao atualizar", description: err?.message, variant: "destructive" });
    },
  });
}

export function useAtribuirRevisional() {
  const { tenantId } = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; userId: string; deadlineId: string }) => {
      const { error } = await (supabase as any)
        .from("planejador_revisionais")
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

export function useArquivarRevisional() {
  const { tenantId } = useTenantId();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("planejador_revisionais")
        .update({ status: "arquivado" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(tenantId) });
      toast({ title: "Revisional arquivado" });
    },
  });
}

export function useReabrirRevisional() {
  const { tenantId } = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("planejador_revisionais")
        .update({ status: "pendente", assigned_to: null, deadline_id: null, atribuido_em: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(tenantId) });
    },
  });
}

export function useDeleteRevisional() {
  const { tenantId } = useTenantId();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("planejador_revisionais")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(tenantId) });
      toast({ title: "Revisional excluído" });
    },
  });
}