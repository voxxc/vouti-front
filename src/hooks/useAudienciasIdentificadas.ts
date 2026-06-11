import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAllPaginated } from "@/lib/supabasePagination";

export interface AudienciaIdentificada {
  andamento_id: string;
  processo_oab_id: string;
  numero_cnj: string | null;
  parte_ativa: string | null;
  parte_passiva: string | null;
  juizo: string | null;
  data_audiencia: Date;
  hora_conhecida: boolean;
  local: string | null;
  modalidade: string | null;
  tipo: string; // Conciliação / Instrução / Art. 334 / Outras
  descricao_original: string;
  data_movimentacao: string;
}

const MESES_PT: Record<string, number> = {
  JANEIRO: 0, FEVEREIRO: 1, MARCO: 2, "MARÇO": 2, ABRIL: 3, MAIO: 4, JUNHO: 5,
  JULHO: 6, AGOSTO: 7, SETEMBRO: 8, OUTUBRO: 9, NOVEMBRO: 10, DEZEMBRO: 11,
};

const KEYWORDS_AGENDAMENTO = /(DESIGNADA|REDESIGNADA|AGENDADA|MARCADA)/i;

function classificarTipo(desc: string): string {
  const u = desc.toUpperCase();
  if (/ART\.?\s*334/.test(u)) return "Art. 334";
  if (/CONCILIA/.test(u)) return "Conciliação";
  if (/INSTRU/.test(u)) return "Instrução";
  if (/JULGAMENTO/.test(u)) return "Julgamento";
  if (/MEDIA/.test(u)) return "Mediação";
  return "Outras";
}

function parseLongo(desc: string): {
  data: Date; hora: boolean; local: string | null; modalidade: string | null;
} | null {
  // Ex: "AGENDADA PARA: 24 DE SETEMBRO DE 2026 ÀS 13:34, EM CEJUSC CASCAVEL - PRO CART - CÍVEL, MODALIDADE: SEMIPRESENCIAL)"
  const re = /AGENDADA\s+PARA:?\s*(\d{1,2})\s+DE\s+([A-ZÇÃÉÍÓÚÂÊÔ]+)\s+DE\s+(\d{4})(?:\s+[ÀA]S\s+(\d{1,2}):(\d{2}))?(?:[,\s]+EM\s+([^,)]+?))?(?:[,\s]+MODALIDADE:\s*([A-ZÇÃÉÍÓÚÂÊÔ]+))?\s*\)?/i;
  const m = desc.match(re);
  if (!m) return null;
  const dia = parseInt(m[1], 10);
  const mesKey = m[2].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const mesIdx = MESES_PT[mesKey] ?? MESES_PT[m[2].toUpperCase()];
  if (mesIdx === undefined) return null;
  const ano = parseInt(m[3], 10);
  const hh = m[4] ? parseInt(m[4], 10) : 12;
  const mm = m[5] ? parseInt(m[5], 10) : 0;
  return {
    data: new Date(ano, mesIdx, dia, hh, mm, 0, 0),
    hora: Boolean(m[4]),
    local: m[6]?.trim() ?? null,
    modalidade: m[7]?.trim() ?? null,
  };
}

function parseCurto(desc: string): {
  data: Date; hora: boolean; local: null; modalidade: null;
} | null {
  // Ex: "AUDIÊNCIA DE CONCILIAÇÃO DESIGNADA(01/06/2026 09:31:23)"
  const re = /(\d{2})\/(\d{2})\/(\d{4})(?:[\s,]+(\d{1,2}):(\d{2}))?/;
  const m = desc.match(re);
  if (!m) return null;
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10) - 1;
  const ano = parseInt(m[3], 10);
  const hh = m[4] ? parseInt(m[4], 10) : 12;
  const mm = m[5] ? parseInt(m[5], 10) : 0;
  return {
    data: new Date(ano, mes, dia, hh, mm, 0, 0),
    hora: Boolean(m[4]),
    local: null,
    modalidade: null,
  };
}

function extrair(desc: string) {
  if (!KEYWORDS_AGENDAMENTO.test(desc)) return null;
  return parseLongo(desc) ?? parseCurto(desc);
}

export function useAudienciasIdentificadas(enabled: boolean) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ["audiencias-identificadas", tenantId],
    enabled: enabled && !!tenantId,
    staleTime: 60_000,
    queryFn: async (): Promise<AudienciaIdentificada[]> => {
      if (!tenantId) return [];

      const { data: andamentos, error } = await fetchAllPaginated<{
        id: string;
        processo_oab_id: string;
        descricao: string | null;
        data_movimentacao: string;
      }>(() =>
        supabase
          .from("processos_oab_andamentos")
          .select("id, processo_oab_id, descricao, data_movimentacao")
          .eq("tenant_id", tenantId)
          .ilike("descricao", "%audiência%")
          .order("data_movimentacao", { ascending: false }) as any
      );
      if (error) throw error;

      const parsed: Array<AudienciaIdentificada & { _key: string }> = [];
      for (const a of andamentos ?? []) {
        const desc = a.descricao ?? "";
        const ext = extrair(desc);
        if (!ext) continue;
        const tipo = classificarTipo(desc);
        parsed.push({
          _key: `${a.processo_oab_id}__${ext.data.toISOString().slice(0, 16)}`,
          andamento_id: a.id,
          processo_oab_id: a.processo_oab_id,
          numero_cnj: null,
          parte_ativa: null,
          parte_passiva: null,
          juizo: null,
          data_audiencia: ext.data,
          hora_conhecida: ext.hora,
          local: ext.local,
          modalidade: ext.modalidade,
          tipo,
          descricao_original: desc,
          data_movimentacao: a.data_movimentacao,
        });
      }

      // Dedup: keep the most recently registered andamento for each (processo + data).
      const dedupMap = new Map<string, AudienciaIdentificada & { _key: string }>();
      for (const p of parsed) {
        const prev = dedupMap.get(p._key);
        if (!prev || new Date(p.data_movimentacao) > new Date(prev.data_movimentacao)) {
          dedupMap.set(p._key, p);
        }
      }
      const deduped = Array.from(dedupMap.values());
      if (deduped.length === 0) return [];

      const processoIds = Array.from(new Set(deduped.map((d) => d.processo_oab_id)));
      const { data: processos } = await supabase
        .from("processos_oab")
        .select("id, numero_cnj, parte_ativa, parte_passiva, juizo")
        .in("id", processoIds);

      const procMap = new Map<string, any>();
      (processos ?? []).forEach((p: any) => procMap.set(p.id, p));

      return deduped.map((d) => {
        const p = procMap.get(d.processo_oab_id);
        return {
          ...d,
          numero_cnj: p?.numero_cnj ?? null,
          parte_ativa: p?.parte_ativa ?? null,
          parte_passiva: p?.parte_passiva ?? null,
          juizo: p?.juizo ?? null,
        };
      });
    },
  });
}