## Causa raiz

O contador "Sigilosos" hoje só inclui processos com `capa_completa->>secrecy_level > 0`. Os **18 processos sem capa carregada** (`secrecy_level` nulo) ficam fora — mas, como você apontou, parte desses casos provavelmente são justamente sigilosos cuja capa não pôde ser baixada. Tratar nulo como "público" é otimista demais.

No tenant atual: 393 público (lvl 0) + 22 lvl 1 + 8 lvl 5 + **18 sem capa** = 441.

## Correção

Tratar `secrecy_level IS NULL` como **possível sigiloso** e somar ao contador.

1. **`useAllProcessosOAB.ts`**
   - `fetchGlobalCounts.sigilosos`: trocar `.gt('capa_completa->>secrecy_level', '0')` por um `.or('capa_completa->>secrecy_level.gt.0,capa_completa->>secrecy_level.is.null,capa_completa.is.null')`. Cobre os 3 cenários: nível > 0, nível ausente no JSON, capa inteira nula.
   - `fetchProcessos` (filtro `sigilosos`): aplicar a mesma cláusula `.or(...)` — clicar em "Sigilosos (X)" passa a listar também os sem capa.

2. **`GeralTab.tsx`** — sem mudança de código; o badge passa a mostrar 30 + 18 = **48** automaticamente.

Sem migrations, sem RLS, sem RPC.

## Arquivos afetados

- `src/hooks/useAllProcessosOAB.ts` — duas trocas (`fetchGlobalCounts` e `fetchProcessos`) para cobrir nível > 0 OU sem capa.

## Impacto

1. **Usuário final (UX)**: badge "Sigilosos" sobe de 30 para 48 no tenant atual. Clicar lista os 30 com nível confirmado + 18 sem capa, todos paginados juntos. Visualmente fica claro quais carecem de credencial para destravar.
2. **Dados**: zero mudança em DB. Query `count head:true` ganha um `OR` extra (ainda `O(n)` em JSON, igual ao atual).
3. **Riscos colaterais**:
   - Se algum dos 18 nulos for público mas só não teve capa sincronizada ainda, ele aparece como sigiloso até a próxima sincronização atualizar `secrecy_level=0`. Aceitável: na prática, processo público sincroniza rápido; nulo persistente costuma ser barreira de credencial.
   - Pode confundir auditoria que esperava "sigilosos = lvl > 0 estrito". Mitigado: badge passa a refletir "sigilosos ou capa indisponível", semântica mais útil.
4. **Quem é afetado**: somente Controladoria > OABs > Geral. Outras abas, CRM, Agenda e demais tenants permanecem inalterados.

## Validação

- Badge "Sigilosos" deve mostrar 48 no tenant atual (30 com nível + 18 sem capa).
- Clicar no badge → 48 processos paginados, sem duplicar.
- Combinar com filtro de UF e busca CNJ — tudo aplica server-side.
- Após sincronizar credencial e baixar capa, nivel passa a 0 e o processo sai do filtro automaticamente no próximo refresh.
