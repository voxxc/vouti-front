/**
 * Helpers para contornar o limite implícito de 1.000 linhas do Supabase
 * em SELECTs sem `.limit()` / `.range()`.
 *
 * Use `fetchAllPaginated` para qualquer listagem cujo objetivo seja retornar
 * "todos os registros visíveis pela RLS". Não usar para selects que devem
 * retornar uma janela limitada (ex.: últimas 200 mensagens) — nesses casos,
 * aplique `.limit()` explícito.
 */

type AnySupabaseBuilder = {
  range: (from: number, to: number) => Promise<{ data: any; error: any }> & any;
};

export interface FetchAllPaginatedOptions {
  /** Tamanho de cada página. Default 1000 (limite do Supabase). */
  pageSize?: number;
  /** Limite máximo de páginas para evitar loops infinitos. Default 50 (50k linhas). */
  hardCap?: number;
}

/**
 * Executa o builder repetidas vezes usando `.range()` até esgotar os resultados.
 *
 * IMPORTANTE: o argumento DEVE ser uma factory que monta o builder do zero a
 * cada chamada — builders do supabase-js NÃO são reaproveitáveis depois de
 * awaited.
 *
 * Exemplo:
 * ```ts
 * const rows = await fetchAllPaginated<MyRow>(() =>
 *   supabase.from('deadlines').select('*').eq('tenant_id', tid).order('id')
 * );
 * ```
 */
export async function fetchAllPaginated<T = any>(
  builderFactory: () => AnySupabaseBuilder,
  options: FetchAllPaginatedOptions = {}
): Promise<{ data: T[]; error: any }> {
  const pageSize = options.pageSize ?? 1000;
  const hardCap = options.hardCap ?? 50;
  const all: T[] = [];
  for (let page = 0; page < hardCap; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const builder = builderFactory();
    const { data, error } = await (builder as any).range(from, to);
    if (error) {
      return { data: all, error };
    }
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return { data: all, error: null };
}
