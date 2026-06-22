## Causa raiz

**1. Drawer abre vazio sem disparar loading.**
Em `SuperAdminMovimentosManuaisDrawer.tsx` o efeito que busca os processos roda quando `open=true`, mas:
- `processos` não é resetado no início do fetch — então se a chamada anterior deixou estado, ou se a edge function devolve `[]` por uma falha silenciosa, a tabela "fica" sem feedback claro.
- Não há estado de erro: se `supabase.functions.invoke` falhar (timeout, 500), só sai um `toast` e a tabela fica em "Nenhum processo encontrado." indistinguível de "realmente não há".
- Não há botão de recarregar visível (apenas implícito via troca de aba), o que impede o usuário de tentar de novo sem fechar/abrir.

**2. Atualização "Atualizado" depende exclusivamente do fluxo de criar movimento.**
Hoje `super_admin_atualizado_em` só é gravado em `super-admin-criar-andamento-manual` (linha 217). Se o admin esquece de marcar o checkbox "marcar como atualizado" ao criar o movimento, o processo nunca aparece na aba **Atualizado**. Não existe ação dedicada de "marcar como atualizado agora".

## Correção

### A) Drawer com feedback robusto — `SuperAdminMovimentosManuaisDrawer.tsx`

1. Adicionar estado `erro: string | null`.
2. No início do fetch: `setProcessos([])` + `setErro(null)` + `setLoading(true)` para garantir spinner visível e estado limpo.
3. Em caso de erro do `invoke`, gravar mensagem em `erro` (além do toast).
4. Renderizar 3 estados explícitos no `ScrollArea`:
   - **Loading** → spinner (já existe).
   - **Erro** → mensagem + botão "Tentar novamente" que chama `recarregar()`.
   - **Vazio** → texto "Nenhum processo encontrado." com botão "Recarregar".
5. Adicionar botão "Recarregar" pequeno na barra de filtros (ao lado do contador `${filtrados.length} processo(s)`), sempre visível, chamando `recarregar()`.
6. Garantir que o efeito sempre execute ao abrir (já roda; só reforçar resetando estado anterior).

### B) Botão "Marcar como atualizado" no painel de detalhes

1. Nova edge function `super-admin-marcar-atualizado`:
   - Body: `{ processo_id: string }`.
   - Valida super admin (mesmo padrão das outras `super-admin-*`).
   - `UPDATE processos_oab SET super_admin_atualizado_em = now() WHERE id = $1`.
   - Retorna `{ ok: true, super_admin_atualizado_em }`.
2. Em `SuperAdminProcessoOABDetalhesPanel.tsx`, na barra "Andamentos (N)" (linhas 312–341), adicionar **antes** do botão "Reordenar" um novo botão `<Button variant="outline" size="sm">` com ícone `CheckCircle2` e label **"Marcar como atualizado"**, que:
   - Chama a nova edge function.
   - Em sucesso: toast "Marcado como atualizado" + `onAndamentoCriado?.()` (já é o callback de recarregar do drawer pai, que joga o processo na aba Atualizado).
   - Loading state local enquanto chama.

## Arquivos afetados

- `src/components/SuperAdmin/SuperAdminMovimentosManuaisDrawer.tsx` — estados de erro/vazio/recarregar.
- `src/components/SuperAdmin/SuperAdminProcessoOABDetalhesPanel.tsx` — novo botão na barra de andamentos.
- `supabase/functions/super-admin-marcar-atualizado/index.ts` — nova edge function (criada).
- `supabase/config.toml` — registrar a nova função (auto-deploy).

## Impacto

- **UX:** o admin nunca mais vê o drawer "vazio sem motivo": ou aparece spinner, ou erro com retry, ou empty state com botão recarregar. Ganha um botão dedicado para marcar o processo como atualizado mesmo sem criar movimento manual — corrige o caso "esqueci do checkbox".
- **Dados:** sem migration. A nova edge function só atualiza `processos_oab.super_admin_atualizado_em` (coluna já existente). Mesma RLS já em vigor.
- **Riscos colaterais:** baixos. A função é restrita a super admins (mesmo guarda das demais `super-admin-*`). O botão de recarregar dispara apenas o `invoke` já existente.
- **Quem é afetado:** apenas usuários super admin operando o drawer "Movimentos manuais" — nenhum tenant final é afetado.

## Validação

- Abrir o drawer com tenant que tem processos → ver spinner e depois lista (não mais "vazio falso").
- Forçar erro (desconectar rede) → ver mensagem de erro + botão "Tentar novamente" funcionando.
- Aba "Atualizado" sem dados → ver empty state com botão "Recarregar".
- Abrir um processo, clicar **"Marcar como atualizado"** → toast de sucesso, drawer pai recarrega, processo passa a aparecer na aba **Atualizado** com "expira em 7d".
- Repetir o clique no mesmo processo → o `super_admin_atualizado_em` é refrescado (volta para 7d).