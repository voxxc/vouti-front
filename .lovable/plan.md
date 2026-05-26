## Causa raiz

Hoje as abas de "Histórico por padrão" no `RebindCredencialJuditPanel` têm presets fixos (TJPR, TJSP, TJMG, TJSC, TJRO, TJTO, Todos, Custom). Não cobrem padrões como `4.04`, `5.09`, `8.22`, etc. O usuário quer ver dinamicamente **todos os padrões J.TR efetivamente monitorados**.

## Correção

1. **Edge function `judit-rebind-credencial-lote`** — novo modo `listPatterns`:
   - Recebe `tenantId` e opcional `globalScope`.
   - Query: `SELECT numero_cnj FROM processos_oab WHERE monitoramento_ativo=true AND tracking_id IS NOT NULL` (filtra por `tenant_id` se não global), paginado via helper.
   - Extrai o segmento `J.TR` (5º campo do CNJ, regex `\.(\d\.\d+)\.\d+$`).
   - Agrupa por J.TR, retorna `[{ pattern: '8.16', label: '%.8.16.%', total: 109 }, ...]` ordenado por `total desc`.

2. **Hook `useRebindCredencialJudit`** — adicionar modo `'listPatterns'` ao tipo `RebindMode` e flag `listPatterns: mode === 'listPatterns'` no body.

3. **`RebindCredencialJuditPanel.tsx`**:
   - No mount (e quando `globalCount` muda), chama `listPatterns` e popula `patterns: { pattern, total }[]`.
   - Renderiza uma `Tab` por padrão retornado (label: `J.TR (total)`, ex.: `8.16 (109)`), mantendo aba "Todos" e "Custom".
   - Cada aba usa `cnjPattern = '%.' + pattern + '.%'` ao chamar `history`.
   - Cache local por pattern continua igual.
   - Remove a lista hardcoded de presets.

## Arquivos afetados

- `supabase/functions/judit-rebind-credencial-lote/index.ts` — novo modo `listPatterns`.
- `src/hooks/useRebindCredencialJudit.ts` — adicionar `'listPatterns'` em `RebindMode`.
- `src/components/Controladoria/RebindCredencialJuditPanel.tsx` — abas dinâmicas baseadas no retorno.

## Impacto

- **Usuário final (UX):** ao abrir o painel, as abas refletem exatamente os tribunais/segmentos onde há tracking ativo. Ex.: hoje aparecerão `8.16 (109)`, `8.22 (98)`, `8.13 (59)`, `8.26 (35)`, `4.04 (12)`, `8.21 (8)`, `5.09 (7)`, `4.03 (3)`, etc. Com o switch global ligado, contempla todos os tenants.
- **Dados:** zero migrações, zero RLS. Apenas leitura extra paginada em `processos_oab`.
- **Riscos colaterais:** baixos. Se houver muitos padrões (>15), a lista de abas pode quebrar — usaremos `flex-wrap` no `TabsList` para acomodar.
- **Quem é afetado:** apenas super-admins usando o painel na Controladoria.

## Validação

1. Abrir painel sem global → ver abas só do tenant atual.
2. Ativar global → abas recarregam mostrando todos os J.TR do sistema com contagem real.
3. Clicar aba `4.04` → histórico filtrado por `%.4.04.%`.
4. Aba "Todos" e "Custom" continuam funcionando.
