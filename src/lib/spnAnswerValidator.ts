// Normaliza e compara traduções para o Word Bank.
// Estratégia: lowercase, trim, remove acentos, remove artigos opcionais comuns,
// colapsa espaços. Compara contra translation_pt e cada accepted_answers[].

const STOP_PREFIXES = ['o ', 'a ', 'os ', 'as ', 'um ', 'uma ', 'uns ', 'umas ', 'to ', 'the ', 'de ', 'do ', 'da '];

export function normalize(input: string): string {
  let s = (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[.,;:!?()'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // remove artigo inicial uma vez
  for (const p of STOP_PREFIXES) {
    if (s.startsWith(p)) { s = s.slice(p.length); break; }
  }
  return s;
}

export interface ValidationResult {
  ok: boolean;
  matched?: string;
}

export function validateAnswer(
  userInput: string,
  translationPt: string | null | undefined,
  acceptedAnswers: string[] | null | undefined
): ValidationResult {
  if (!translationPt) return { ok: false };
  const u = normalize(userInput);
  if (!u) return { ok: false };
  const candidates = [translationPt, ...(acceptedAnswers || [])];
  for (const c of candidates) {
    if (normalize(c) === u) return { ok: true, matched: c };
  }
  return { ok: false };
}