## Causa raiz

Hoje o filtro de **UF** na aba OABs > Geral tem dois problemas:

1. **A lista de UFs no Select é "suja"**: `extrairUFFromRow` só mapeia `segmento = 8` (Justiça Estadual) para sigla de estado (ex.: `8.16 → PR`). Para Justiça Federal (`4.xx`) e Trabalho (`5.xx`) ela retorna o rótulo bruto `4.04`, `5.09`, etc. Resultado: o Select mostra ao mesmo tempo "PR (123)", "8.16 (X)", "5.09 (Y)", "4.04 (Z)" — o usuário não consegue filtrar **todos os processos do Paraná** num único clique.

2. **O filtro server-side é restritivo demais**: quando o usuário clica em "PR", o hook aplica somente `.ilike('tribunal_sigla', 'TJPR%')`. Isso:
   - ignora TRT-9 (`5.09`), TRF-4 (`4.04`) e demais tribunais do PR;
   - quebra para processos sem `tribunal_sigla` cadastrada (cai fora do resultado);
   - quando o valor escolhido é um rótulo bruto tipo `8.16`, vira `ilike('tribunal_sigla', 'TJ8.16%')` que nunca casa, gerando "nenhum resultado" — e em algumas linhas com `tribunal_sigla` nulo combinado com outros estados a página pode estourar contadores zerados (sensação de "deu erro").

A "página de erro" que você viu vem desse segundo ponto: clicar num rótulo numérico (`5.09`, `4.04`) ou em "PR" zera tudo, deixando a paginação inconsistente em relação ao badge global.

## Correção

Centralizar um mapa **UF ↔ códigos CNJ por segmento** e usá-lo nos dois lados (UI e query):

```text
PR → segmento 8 código 16 (TJPR) | segmento 5 código 09 (TRT-9) | segmento 4 código 04 (TRF-4)
SP → 8.26 | 5.02 | 4.03
RJ → 8.19 | 5.01 | 4.02
... (todos os 27 estados, mais STJ/STF como categorias separadas)
```

1. **Novo helper `src/utils/cnjUFMap.ts`** com:
   - `UF_TO_CNJ_CODES`: `{ PR: { tj: '16', trt: '09', trf: '04' }, ... }`
   - `cnjUFFromRow(tribunal_sigla, numero_cnj)` — substitui `extrairUFFromRow`, agora **sempre** retorna sigla de estado (PR/SP/RJ...) ou `null`. Reconhece TJxx, TRTx, TRFx via regex e cai no CNJ se necessário.
   - `buildUFOrFilter(uf)` — gera string para `.or()` do Supabase: `numero_cnj.like.%.8.16.%,numero_cnj.like.%.5.09.%,numero_cnj.like.%.4.04.%,tribunal_sigla.eq.TJPR,tribunal_sigla.eq.TRT9,tribunal_sigla.eq.TRF4`.

2. **`useAllProcessosOAB.ts`**:
   - `fetchGlobalCounts` passa a usar `cnjUFFromRow` → `globalCounts.ufs` fica limpo (só PR, SP, RJ, etc.). Linhas sem UF detectável vão para uma chave `null` e ficam fora do Select.
   - No `fetchProcessos`, quando `filtroPrincipal.tipo === 'uf'`, trocar o `ilike` por `query.or(buildUFOrFilter(uf))`. Cobre TJ + TRT + TRF do estado num só filtro.
   - Remover `TRIBUNAL_UF_MAP_HOOK` local (passa a vir do helper).

3. **`GeralTab.tsx`**:
   - A lista de UFs no Select já vem limpa via `globalCounts.ufs` (sem mudança de código no componente — só os valores melhoram).
   - Ajustar o rótulo para mostrar nome do estado (opcional, já que hoje mostra a sigla).

Sem migrations, sem mudança de RLS, sem nova RPC.

## Arquivos afetados

- `src/utils/cnjUFMap.ts` *(novo)* — mapa estado→códigos e helpers `cnjUFFromRow` / `buildUFOrFilter`.
- `src/hooks/useAllProcessosOAB.ts` — usa o helper em `fetchGlobalCounts` e troca o `ilike` de UF por `or(...)` cobrindo TJ/TRT/TRF.
- `src/components/Controladoria/GeralTab.tsx` — opcionalmente exibir nome do estado ao lado da sigla na linha do Select.

## Impacto

1. **Usuário final (UX)**: clicar em "PR" passa a listar **todos** os processos do Paraná — TJPR (8.16), TRT-9 (5.09), TRF-4 (4.04) — paginados corretamente. Os rótulos numéricos `5.09`, `4.04`, `8.16` somem do Select. Contador da UF reflete a soma das três justiças.
2. **Dados**: zero mudança em DB. As queries trocam `ilike` por `or(...)` com 3 a 6 condições (rápido, todas em colunas indexadas: `numero_cnj`, `tribunal_sigla`).
3. **Riscos colaterais**:
   - Processos com `tribunal_sigla` em formato exótico (ex.: `TRT-09`, `TRT09 - PR`) podem ficar fora se o helper não normalizar; mitigado adicionando match por `numero_cnj` no `or(...)` (cobre todos via CNJ).
   - Tribunais superiores (STJ, STF, TST, TSE) continuam fora do filtro por UF — aparecerão só em "Todos".
   - Linhas sem `numero_cnj` válido **e** sem `tribunal_sigla` ficam invisíveis ao filtro de UF (já era assim hoje).
4. **Quem é afetado**: somente usuários da Controladoria > OABs > Geral. Nenhum impacto em CRM, Agenda, outras abas, outros tenants ou edge functions.

## Validação

- Selecionar "PR": badge "Total" deve bater com soma TJPR + TRT-9 + TRF-4; paginar até a última página sem queda do total.
- Selecionar "SP": confere TJSP (8.26) + TRT-2 (5.02) + TRF-3 (4.03).
- Combinar UF + busca CNJ + filtro de Apartado: tudo aplica server-side junto.
- Conferir que `5.09`, `4.04`, `8.16` não aparecem mais como opções no Select.
- Limpar filtro: volta ao total geral sem inconsistência.
