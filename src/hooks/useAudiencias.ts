import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fetchAllPaginated } from "@/lib/supabasePagination";

export type AudienciaStatus = "pendente" | "confirmada" | "realizada" | "cancelada" | "adiada";

export interface AudienciaRow {
  id: string;
  processo_oab_id: string;
  andamento_origem_id: string | null;
  data_audiencia: string;
  hora_conhecida: boolean;
  tipo: string;
  modalidade: string | null;
  local: string | null;
  status: AudienciaStatus;
  observacoes: string | null;
  descricao_origem: string | null;
  created_at: string;
  // joined
  numero_cnj?: string | null;
  parte_ativa?: string | null;
  parte_passiva?: string | null;
  juizo?: string | null;
  responsaveis?: ResponsavelLite[];
  comentarios_count?: number;
}

export interface ResponsavelLite {
  id: string;
  user_id: string;
  papel: "titular" | "suporte";
  full_name: string | null;
  avatar_url: string | null;
}

export interface ComentarioRow {
  id: string;
  audiencia_id: string;
  user_id: string;
  comentario: string;
  created_at: string;
  autor?: { full_name: string | null; avatar_url: string | null; email: string | null };
}

export interface HistoricoRow {
  id: string;
  audiencia_id: string;
  user_id: string | null;
  acao: string;
  de: any;
  para: any;
  created_at: string;
  autor?: { full_name: string | null; avatar_url: string | null };
}

// ----- Sync (parse andamentos -> upsert audiencias) -------------------
const MESES_PT: Record<string, number> = {
  JANEIRO: 0, FEVEREIRO: 1, MARCO: 2, ABRIL: 3, MAIO: 4, JUNHO: 5,
  JULHO: 6, AGOSTO: 7, SETEMBRO: 8, OUTUBRO: 9, NOVEMBRO: 10, DEZEMBRO: 11,
};
const KEYWORDS = /(DESIGNADA|REDESIGNADA|AGENDADA|MARCADA)/i;

function classificarTipo(desc: string): string {
  const u = desc.toUpperCase();
  if (/ART\.?\s*334/.test(u)) return "Art. 334";
  if (/CONCILIA/.test(u)) return "Conciliação";
  if (/INSTRU/.test(u)) return "Instrução";
  if (/JULGAMENTO/.test(u)) return "Julgamento";
  if (/MEDIA/.test(u)) return "Mediação";
  return "Outras";
}

function parseLongo(desc: string) {
  const re = /AGENDADA\s+PARA:?\s*(\d{1,2})\s+DE\s+([A-ZÇÃÉÍÓÚÂÊÔ]+)\s+DE\s+(\d{4})(?:\s+[ÀA]S\s+(\d{1,2}):(\d{2}))?(?:[,\s]+EM\s+([^,)]+?))?(?:[,\s]+MODALIDADE:\s*([A-ZÇÃÉÍÓÚÂÊÔ]+))?\s*\)?/i;
  const m = desc.match(re);
  if (!m) return null;
  const dia = +m[1];
  const mesKey = m[2].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const mesIdx = MESES_PT[mesKey];
  if (mesIdx === undefined) return null;
  return {
    data: new Date(+m[3], mesIdx, dia, m[4] ? +m[4] : 12, m[5] ? +m[5] : 0),
    hora: Boolean(m[4]),
    local: m[6]?.trim() ?? null,
    modalidade: m[7]?.trim() ?? null,
  };
}
function parseCurto(desc: string) {
  const m = desc.match(/(\d{2})\/(\d{2})\/(\d{4})(?:[\s,]+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  return {
    data: new Date(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 12, m[5] ? +m[5] : 0),
    hora: Boolean(m[4]),
    local: null as string | null,
    modalidade: null as string | null,
  };
}

export function useSyncAudiencias() {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) return 0;
      const { data: andamentos, error } = await fetchAllPaginated<{
        id: string; processo_oab_id: string; descricao: string | null;
      }>(() =>
        supabase
          .from("processos_oab_andamentos")
          .select("id, processo_oab_id, descricao")
          .eq("tenant_id", tenantId)
          .ilike("descricao", "%audiência%") as any
      );
      if (error) throw error;

      const seen = new Set<string>();
      const payload: any[] = [];
      for (const a of andamentos ?? []) {
        const desc = a.descricao ?? "";
        if (!KEYWORDS.test(desc)) continue;
        const ext = parseLongo(desc) ?? parseCurto(desc);
        if (!ext) continue;
        const key = `${a.processo_oab_id}__${ext.data.toISOString().slice(0, 16)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        payload.push({
          processo_oab_id: a.processo_oab_id,
          andamento_id: a.id,
          data_audiencia: ext.data.toISOString(),
          hora_conhecida: ext.hora,
          tipo: classificarTipo(desc),
          modalidade: ext.modalidade,
          local: ext.local,
          descricao_original: desc,
        });
      }
      if (!payload.length) return 0;
      const { data, error: rpcErr } = await supabase.rpc("sync_audiencias_oab", {
        p_tenant_id: tenantId,
        p_payload: payload as any,
      });
      if (rpcErr) throw rpcErr;
      return (data as number) ?? payload.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["audiencias", tenantId] });
      if (n > 0) toast({ title: "Sincronizado", description: `${n} audiência(s) processada(s).` });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao sincronizar", description: err?.message ?? "Tente novamente.", variant: "destructive" });
    },
  });
}

// ----- List ----------------------------------------------------------
export function useAudiencias(enabled: boolean) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ["audiencias", tenantId],
    enabled: enabled && !!tenantId,
    staleTime: 30_000,
    queryFn: async (): Promise<AudienciaRow[]> => {
      if (!tenantId) return [];
      const { data: aud, error } = await supabase
        .from("audiencias")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("data_audiencia", { ascending: true });
      if (error) throw error;
      const rows = (aud ?? []) as any as AudienciaRow[];
      if (!rows.length) return [];

      const procIds = Array.from(new Set(rows.map((r) => r.processo_oab_id)));
      const audIds = rows.map((r) => r.id);

      const [{ data: procs }, { data: resps }, { data: counts }] = await Promise.all([
        supabase.from("processos_oab")
          .select("id, numero_cnj, parte_ativa, parte_passiva, juizo")
          .in("id", procIds),
        supabase.from("audiencia_responsaveis")
          .select("id, audiencia_id, user_id, papel")
          .in("audiencia_id", audIds),
        supabase.from("audiencia_comentarios")
          .select("audiencia_id")
          .in("audiencia_id", audIds),
      ]);

      const userIds = Array.from(new Set((resps ?? []).map((r: any) => r.user_id)));
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds)
        : { data: [] as any[] };

      const procMap = new Map((procs ?? []).map((p: any) => [p.id, p]));
      const profMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      const respByAud = new Map<string, ResponsavelLite[]>();
      for (const r of resps ?? []) {
        const list = respByAud.get((r as any).audiencia_id) ?? [];
        const prof = profMap.get((r as any).user_id);
        list.push({
          id: (r as any).id,
          user_id: (r as any).user_id,
          papel: (r as any).papel,
          full_name: prof?.full_name ?? null,
          avatar_url: prof?.avatar_url ?? null,
        });
        respByAud.set((r as any).audiencia_id, list);
      }
      const countMap = new Map<string, number>();
      for (const c of counts ?? []) {
        const id = (c as any).audiencia_id;
        countMap.set(id, (countMap.get(id) ?? 0) + 1);
      }

      return rows.map((r) => {
        const p = procMap.get(r.processo_oab_id) as any;
        return {
          ...r,
          numero_cnj: p?.numero_cnj ?? null,
          parte_ativa: p?.parte_ativa ?? null,
          parte_passiva: p?.parte_passiva ?? null,
          juizo: p?.juizo ?? null,
          responsaveis: respByAud.get(r.id) ?? [],
          comentarios_count: countMap.get(r.id) ?? 0,
        };
      });
    },
  });
}

// ----- Detail (comentarios + historico) ------------------------------
export function useAudienciaDetalhe(audienciaId: string | null) {
  const { tenantId } = useAuth();
  const qc = useQueryClient();

  const comentarios = useQuery({
    queryKey: ["audiencia-comentarios", audienciaId],
    enabled: !!audienciaId,
    queryFn: async (): Promise<ComentarioRow[]> => {
      const { data, error } = await supabase
        .from("audiencia_comentarios")
        .select("*")
        .eq("audiencia_id", audienciaId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any as ComentarioRow[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("user_id, full_name, avatar_url, email").in("user_id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      return rows.map((r) => ({ ...r, autor: map.get(r.user_id) }));
    },
  });

  const historico = useQuery({
    queryKey: ["audiencia-historico", audienciaId],
    enabled: !!audienciaId,
    queryFn: async (): Promise<HistoricoRow[]> => {
      const { data, error } = await supabase
        .from("audiencia_historico")
        .select("*")
        .eq("audiencia_id", audienciaId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as any as HistoricoRow[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      return rows.map((r) => ({ ...r, autor: r.user_id ? map.get(r.user_id) : undefined }));
    },
  });

  // Realtime para comentarios + historico
  useEffect(() => {
    if (!audienciaId) return;
    const ch = supabase
      .channel(`aud-${audienciaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "audiencia_comentarios", filter: `audiencia_id=eq.${audienciaId}` },
        () => qc.invalidateQueries({ queryKey: ["audiencia-comentarios", audienciaId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "audiencia_historico", filter: `audiencia_id=eq.${audienciaId}` },
        () => qc.invalidateQueries({ queryKey: ["audiencia-historico", audienciaId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "audiencia_responsaveis", filter: `audiencia_id=eq.${audienciaId}` },
        () => qc.invalidateQueries({ queryKey: ["audiencias", tenantId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [audienciaId, qc, tenantId]);

  return { comentarios, historico };
}

// ----- Mutations -----------------------------------------------------
export function useAudienciaMutations() {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = (audId?: string) => {
    qc.invalidateQueries({ queryKey: ["audiencias", tenantId] });
    if (audId) {
      qc.invalidateQueries({ queryKey: ["audiencia-comentarios", audId] });
      qc.invalidateQueries({ queryKey: ["audiencia-historico", audId] });
    }
  };

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AudienciaStatus }) => {
      const { error } = await supabase.from("audiencias").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => invalidate(v.id),
    onError: (e: any) => toast({ title: "Erro ao atualizar status", description: e?.message, variant: "destructive" }),
  });

  const setObservacoes = useMutation({
    mutationFn: async ({ id, observacoes }: { id: string; observacoes: string }) => {
      const { error } = await supabase.from("audiencias").update({ observacoes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => invalidate(v.id),
  });

  const addResponsavel = useMutation({
    mutationFn: async ({ audiencia_id, user_id, papel }: { audiencia_id: string; user_id: string; papel: "titular" | "suporte" }) => {
      if (!tenantId) throw new Error("sem tenant");
      const { error } = await supabase.from("audiencia_responsaveis").insert({
        audiencia_id, user_id, papel, tenant_id: tenantId, created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, v) => invalidate(v.audiencia_id),
    onError: (e: any) => toast({ title: "Erro ao adicionar responsável", description: e?.message, variant: "destructive" }),
  });

  const removeResponsavel = useMutation({
    mutationFn: async ({ id, audiencia_id }: { id: string; audiencia_id: string }) => {
      const { error } = await supabase.from("audiencia_responsaveis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => invalidate(v.audiencia_id),
  });

  const addComentario = useMutation({
    mutationFn: async ({ audiencia_id, comentario }: { audiencia_id: string; comentario: string }) => {
      if (!tenantId) throw new Error("sem tenant");
      const u = (await supabase.auth.getUser()).data.user;
      if (!u) throw new Error("não autenticado");
      const { error } = await supabase.from("audiencia_comentarios").insert({
        audiencia_id, comentario, tenant_id: tenantId, user_id: u.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, v) => invalidate(v.audiencia_id),
    onError: (e: any) => toast({ title: "Erro ao comentar", description: e?.message, variant: "destructive" }),
  });

  const deleteComentario = useMutation({
    mutationFn: async ({ id, audiencia_id }: { id: string; audiencia_id: string }) => {
      const { error } = await supabase.from("audiencia_comentarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => invalidate(v.audiencia_id),
  });

  return { setStatus, setObservacoes, addResponsavel, removeResponsavel, addComentario, deleteComentario };
}

// ----- Tenant users (para popover de adicionar responsável) ----------
export function useTenantUsers(enabled: boolean) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ["tenant-users-simple", tenantId],
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .eq("tenant_id", tenantId!)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}