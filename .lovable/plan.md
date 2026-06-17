## Causa raiz

O componente `ApartadoCard` (checkbox "Marcar como apartado") já existe e é renderizado em `src/components/Controladoria/ProcessoOABDetalhes.tsx` (linhas 1154-1156), mas está condicionado a `useCanUseApartados()`, que chama a RPC `public.can_use_apartados(_user_id)`. A função SQL atual retorna `true` apenas para o UUID `8eda80fa-0319-4791-923e-551052282e62` (Daniel). Para todos os outros usuários o card não aparece — por isso você não encontra a opção no drawer do processo.

## Correção

Preciso saber **para quem** liberar antes de gerar a migration. Possíveis escopos:

1. Liberar para **todos os admins** (via `has_role(_user_id, 'admin')`) de todos os tenants.
2. Liberar para admins **+ controller/financeiro** (perfis de controladoria).
3. Liberar para **todos os usuários autenticados** (sem gate — qualquer pessoa com acesso ao processo pode marcar).
4. Liberar apenas para uma **lista específica de e-mails/UUIDs** que você me passar.

A correção em si é uma migration única substituindo o corpo da função `can_use_apartados`, sem mudar frontend, RLS de `processos_oab`, nem o card.

## Arquivos afetados

- Nova migration em `supabase/migrations/` — reescreve `public.can_use_apartados(uuid)` conforme o escopo escolhido.
- Nenhuma alteração em código TS/React.

## Onde a opção aparece (após liberação)

No drawer de detalhes do processo da Controladoria (mesma tela do seu print), logo abaixo do card "Monitoramento Diário / Credencial Judit", como uma linha pequena com checkbox + texto "Marcar como apartado". Quando marcado, o processo passa a aparecer no filtro **"Apartados"** da Central de Andamentos Não Lidos e da aba Geral.

## Impacto

1. **Usuário final (UX):** os usuários incluídos no novo escopo passarão a ver o checkbox no drawer do processo e o filtro "Apartados" nas listas onde ele já está implementado. Quem ficar de fora continua sem ver nada (comportamento atual).
2. **Dados:** apenas a função `can_use_apartados` muda. As colunas `apartado`, `apartado_em`, `apartado_por` em `processos_oab` e o índice parcial já existem desde a migration de 10/06/2026. Sem impacto em performance, sem backfill.
3. **Riscos colaterais:** se eu escolher "todos autenticados", qualquer usuário com acesso ao processo (via RLS atual de `processos_oab`) poderá marcar/desmarcar — incluindo perfis como advogado/estagiário. A marcação é registrada com `apartado_por` + `apartado_em`, então é auditável, mas não há policy específica restringindo *quem* pode escrever no campo (a RLS de `processos_oab` é por tenant). Se quiser restringir escrita, preciso adicionar policy `WITH CHECK` separada.
4. **Quem é afetado:** depende da opção escolhida. Em qualquer caso é multi-tenant — a liberação atinge usuários do papel escolhido em todos os tenants.

## Validação

1. Após aplicar a migration, recarregar o drawer de um processo OAB → o checkbox "Marcar como apartado" deve aparecer entre o card de monitoramento e as abas.
2. Marcar o checkbox → toast "Processo marcado como apartado" e legenda "desde DD/MM/YYYY por <Nome>".
3. Ir na Central de Andamentos Não Lidos / aba Geral → filtro "Apartados" deve listar o processo marcado.
4. Logar com um usuário **fora** do escopo escolhido → o card não deve aparecer (gate continua funcionando).

---

**Me confirme qual escopo (1, 2, 3 ou 4) eu devo aplicar** que eu gero a migration na sequência.