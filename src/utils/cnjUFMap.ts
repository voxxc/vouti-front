// Mapa centralizado UF ↔ códigos CNJ por segmento (Justiça Estadual / Trabalho / Federal)
// Segmentos do CNJ: 8 = Estadual, 5 = Trabalho (TRT), 4 = Federal (TRF)

export interface UFCnjCodes {
  tj?: string;        // código no segmento 8 (TJxx)
  trt?: string[];     // código(s) no segmento 5 (TRT)
  trf?: string[];     // código(s) no segmento 4 (TRF)
}

export const UF_TO_CNJ_CODES: Record<string, UFCnjCodes> = {
  AC: { tj: '01', trt: ['14'], trf: ['01'] },
  AL: { tj: '02', trt: ['19'], trf: ['05'] },
  AP: { tj: '03', trt: ['08'], trf: ['01'] },
  AM: { tj: '04', trt: ['11'], trf: ['01'] },
  BA: { tj: '05', trt: ['05'], trf: ['01'] },
  CE: { tj: '06', trt: ['07'], trf: ['05'] },
  DF: { tj: '07', trt: ['10'], trf: ['01'] },
  ES: { tj: '08', trt: ['17'], trf: ['02'] },
  GO: { tj: '09', trt: ['18'], trf: ['01'] },
  MA: { tj: '10', trt: ['16'], trf: ['01'] },
  MT: { tj: '11', trt: ['23'], trf: ['01'] },
  MS: { tj: '12', trt: ['24'], trf: ['03'] },
  MG: { tj: '13', trt: ['03'], trf: ['01', '06'] }, // TRF6 criado em 2022
  PA: { tj: '14', trt: ['08'], trf: ['01'] },
  PB: { tj: '15', trt: ['13'], trf: ['05'] },
  PR: { tj: '16', trt: ['09'], trf: ['04'] },
  PE: { tj: '17', trt: ['06'], trf: ['05'] },
  PI: { tj: '18', trt: ['22'], trf: ['01'] },
  RJ: { tj: '19', trt: ['01'], trf: ['02'] },
  RN: { tj: '20', trt: ['21'], trf: ['05'] },
  RS: { tj: '21', trt: ['04'], trf: ['04'] },
  RO: { tj: '22', trt: ['14'], trf: ['01'] },
  RR: { tj: '23', trt: ['11'], trf: ['01'] },
  SC: { tj: '24', trt: ['12'], trf: ['04'] },
  SE: { tj: '25', trt: ['20'], trf: ['05'] },
  SP: { tj: '26', trt: ['02', '15'], trf: ['03'] }, // TRT-2 (capital) + TRT-15 (Campinas)
  TO: { tj: '27', trt: ['10'], trf: ['01'] },
};

// Inverso: "8.16" -> PR, "5.09" -> PR, "4.04" -> PR/RS/SC (ambíguo: usa primeiro)
const CODE_TO_UF: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  Object.entries(UF_TO_CNJ_CODES).forEach(([uf, codes]) => {
    if (codes.tj) map[`8.${codes.tj}`] = uf;
    // TRT/TRF podem ser compartilhados entre estados — mantém o primeiro registrado
    codes.trt?.forEach((c) => {
      const k = `5.${c}`;
      if (!map[k]) map[k] = uf;
    });
    codes.trf?.forEach((c) => {
      const k = `4.${c}`;
      if (!map[k]) map[k] = uf;
    });
  });
  return map;
})();

/** Tenta extrair a UF a partir de tribunal_sigla (TJxx, TRTx, TRFx) ou do CNJ. */
export function cnjUFFromRow(
  tribunalSigla: string | null | undefined,
  numeroCnj?: string | null,
): string | null {
  if (tribunalSigla) {
    const sigla = tribunalSigla.toUpperCase().replace(/[\s-]/g, '');
    const tj = sigla.match(/TJ([A-Z]{2})/);
    if (tj && UF_TO_CNJ_CODES[tj[1]]) return tj[1];
    const trt = sigla.match(/TRT0?(\d{1,2})/);
    if (trt) {
      const code = trt[1].padStart(2, '0');
      const uf = CODE_TO_UF[`5.${code}`];
      if (uf) return uf;
    }
    const trf = sigla.match(/TRF0?(\d)/);
    if (trf) {
      const code = trf[1].padStart(2, '0');
      const uf = CODE_TO_UF[`4.${code}`];
      if (uf) return uf;
    }
  }
  if (numeroCnj) {
    const m = numeroCnj.match(/\.\d{4}\.(\d)\.(\d{2})\./);
    if (m) {
      const key = `${m[1]}.${m[2]}`;
      if (CODE_TO_UF[key]) return CODE_TO_UF[key];
    }
  }
  return null;
}

/**
 * Constrói cláusula `.or()` do Supabase para filtrar por UF cobrindo TJ + TRT + TRF do estado.
 * Usa padrões em numero_cnj (`.YYYY.J.TR.`) e siglas em tribunal_sigla.
 */
export function buildUFOrFilter(uf: string): string | null {
  const codes = UF_TO_CNJ_CODES[uf.toUpperCase()];
  if (!codes) return null;
  const parts: string[] = [];

  if (codes.tj) {
    parts.push(`numero_cnj.like.%.8.${codes.tj}.%`);
    parts.push(`tribunal_sigla.ilike.TJ${uf}%`);
  }
  codes.trt?.forEach((c) => {
    parts.push(`numero_cnj.like.%.5.${c}.%`);
    parts.push(`tribunal_sigla.ilike.TRT${Number(c)}%`);
    parts.push(`tribunal_sigla.ilike.TRT-${Number(c)}%`);
  });
  codes.trf?.forEach((c) => {
    parts.push(`numero_cnj.like.%.4.${c}.%`);
    parts.push(`tribunal_sigla.ilike.TRF${Number(c)}%`);
    parts.push(`tribunal_sigla.ilike.TRF-${Number(c)}%`);
  });

  return parts.join(',');
}