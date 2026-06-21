## Causa raiz

Na aba **OABs > Geral**, os filtros (Monitorados, Sigilosos, Não lidos, UF, OAB, Apartado) são aplicados **somente sobre a página atual** (20 itens já paginados pelo servidor). O fluxo hoje é:

1. `useAllProcessosOAB` faz `range(from, to)` no Supabase → traz 20 processos da página
2. `GeralTab` chama `processos.filter(p => p.monitoramento_ativo)` em cima desses 20

Por isso "Monitorados (384)" aparece como contador, mas ao clicar mostra só os monitorados que por acaso estão entre os 20 visíveis. O `totalCount` exibido na paginação continua sendo o de "todos os processos", não o do filtro ativo.

## Correção

Mover os filtros para o **servidor**, dentro de `useAllProcessosOAB`, e recalcular os contadores globais separadamente.

1. **Hook `useAllProcessosOAB`** passa a aceitar:
   - `filtroPrincipal`: `'todos' | 'monitorados' | 'sigilosos' | 'nao-lidos' | 'uf:XX' | 'oab:numero/uf'`
   - `filtroApartado`: `'todos' | 'apartados' | 'nao_apartados'`

2. **Aplicar no query Supabase** (em vez de filtrar no cliente):
   - Monitorados → `.eq('monitoramento_ativo', true)`
   - Sigilosos → `.gte('capa_completa->>secrecy_level', 1)` (filtro em JSON)
   - UF → `.ilike('tribunal_sigla', \`TJ${uf}%\`)` (mantém fallback de extração para badges)
   - OAB → `.eq('oabs_cadastradas.oab_numero', n).eq('oabs_cadastradas.oab_uf', uf)` no inner join
   - Apartado → `.eq('apartado', true/false)`
   - Não-lidos → primeiro chamar RPC `get_andamentos_nao_lidos_por_processo`, extrair ids com `nao_lidos > 0`, depois `.in('id', ids)` na query principal

3. **`totalCount`** passa a refletir o filtro (count: 'exact' já considera os WHEREs aplicados). Paginação 1..N se adapta automaticamente ao subconjunto.

4. **Badges globais** (441 / 384 / X sigilosos / X não-lidos) deixam de vir de `processos` (que é só a página) e passam a vir de queries de contagem dedicadas em paralelo:
   - `count: 'exact', head: true` para monitorados e sigilosos no tenant
   - RPC já usada para não-lidos retorna lista global → contar `length` dela
   - Resultado fixo independente da página/filtro atual

## Arquivos afetados

- `src/hooks/useAllProcessosOAB.ts` — receber filtros, aplicar server-side, expor `globalCounts` (total, monitorados, sigilosos, naoLidos)
- `src/components/Controladoria/GeralTab.tsx` — passar filtros pro hook, remover `processosFiltrados` (usar `processos` direto), ler badges de `globalCounts`, manter selects de UF/OAB usando contagens globais (nova RPC simples ou lista pré-carregada uma única vez)

Sem migrations, sem mudanças de RLS.

## Impacto

1. **Usuário final (UX)**: clicar em "Monitorados (384)" passa a listar realmente 384 processos paginados em ~20 páginas. O contador "Página X de Y (N processos)" reflete o filtro. Badges no Select sempre globais, não mudam ao trocar de página.
2. **Dados**: +2 queries `count head:true` no carregamento (leves). RPC de não-lidos já é chamada hoje, reaproveitada para o badge. Sem novas tabelas, sem migrations.
3. **Riscos colaterais**:
   - Deduplicação por `numero_cnj` continua sendo feita no cliente após o range — em filtros amplos isso pode resultar numa página com 18-20 itens em vez de 20 quando há OABs duplicadas no mesmo CNJ. Aceitável (já acontece hoje).
   - Filtro de UF por `tribunal_sigla` ignora processos sem sigla cadastrada (raros). A extração via `numero_cnj` continua sendo usada apenas para o **rótulo** de UF na tabela.
   - Lista de UFs/OABs no Select hoje vem de `processos` (só a página). Será carregada uma vez via agregação separada (ou aceito que mostre só as da página, com aviso). Proposta: carregar a lista global via uma única query `select tribunal_sigla, oabs_cadastradas(oab_numero, oab_uf) where tenant_id = ...` paginada com `fetchAllPaginated` (já existe utilitário no projeto).
4. **Quem é afetado**: usuários da Controladoria (todos os papéis com acesso a OABs). Não afeta CRM, Agenda, outros tenants nem outras abas.

## Validação

- Filtrar "Monitorados": confirmar `totalCount = 384` e navegar até a última página
- Filtrar "Sigilosos", "Não lidos", UF, OAB, Apartado — paginação respeita cada filtro
- Combinar filtro + busca por CNJ — ambos aplicam no servidor
- Trocar de página com filtro ativo — badges "(384)" não mudam
- Limpar filtro → volta ao total geral 441
