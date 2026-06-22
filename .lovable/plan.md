## Causa raiz

Hoje, ao clicar "Finalizar" no `AdicionarMovimentoManualDialog`, o dialog fecha em segundo plano e o painel de detalhes (`SuperAdminProcessoOABDetalhesPanel`) continua aberto no processo recém-atualizado. O usuário precisa fechar manualmente, voltar à lista do drawer e clicar no próximo processo da fila — quebra o ritmo de trabalho em lote.

## Correção

Implementar **auto-avanço** para o próximo processo da fila (`filtrados`) sempre que o atual sai do conjunto visível.

1. **`SuperAdminMovimentosManuaisDrawer.tsx`**
   - Calcular o "próximo da fila" a partir da lista `filtrados` atual e do `selecionado.id` ANTES da mutação otimista (a remoção muda os índices).
   - Estender `handleProcessoMutado(id, acao)` para, quando `acao === 'atualizado'`:
     1. Identificar `proximoId = filtrados[indexAtual + 1]?.id ?? null` (somente quando `selecionado?.id === id`).
     2. Aplicar a mutação otimista atual (remover da aba `'total'` / atualizar `super_admin_atualizado_em` na aba `'atualizado'`).
     3. Se `proximoId` existir: `setSelecionado(proximoFromProcessos)` e marcar visitado.
     4. Se não houver próximo: `setSelecionado(null)` (fecha o painel) e mostra toast `"Fila concluída"`.

2. **`SuperAdminProcessoOABDetalhesPanel.tsx`**
   - Não precisa de novas props: o `useEffect([open, processo.id])` já recarrega `detalhes` quando `processo.id` muda, então trocar `selecionado` no drawer já faz o painel re-renderizar com o próximo processo, sem fechar/abrir.
   - Manter a chamada existente `onProcessoMutado?.(processo.id, 'atualizado')` em:
     - `onSuccess` do `AdicionarMovimentoManualDialog` (gatilho principal pedido pelo usuário)
     - `marcarComoAtualizado` (mesma UX, comportamento consistente)

3. **Comportamento na aba `'atualizado'`**: como o processo não sai da lista, o auto-avanço NÃO é aplicado — o painel permanece aberto no processo atual (já atualizado), preservando o fluxo de revisão. Só auto-avança na aba `'total'`.

## Arquivos afetados

- `src/components/SuperAdmin/SuperAdminMovimentosManuaisDrawer.tsx` — estender `handleProcessoMutado` com lógica de "próximo da fila" + `setSelecionado`.
- `src/components/SuperAdmin/SuperAdminProcessoOABDetalhesPanel.tsx` — nenhuma mudança estrutural; apenas confirmar que o `useEffect` de carregar detalhes depende de `processo.id` (já depende).

## Impacto

- **Usuário final (UX)**: ao clicar "Finalizar" (ou "Marcar como atualizado") na aba "Total", o dialog fecha, o painel já troca instantaneamente para o próximo processo da fila — o usuário pode revisar/atualizar em sequência sem voltar à tabela. Quando a fila acaba, o painel fecha sozinho com toast "Fila concluída".
- **Dados**: zero — nenhuma chamada de rede nova, sem migrations, sem RLS.
- **Riscos colaterais**:
  - Se o salvamento em segundo plano falhar, o usuário já estará no próximo processo. Mitigação: o toast de erro do background save (já existente) continua aparecendo no canto, e o caso anterior continuará na lista do drawer (a mutação otimista só roda no sucesso do `onSuccess`).
  - "Próximo" é calculado pela ordem de `filtrados` no momento do clique — respeita busca/filtros aplicados.
  - Se o usuário aplicar/mudar filtros enquanto um painel está aberto, o "próximo" pode ser diferente do que ele imaginava. Aceitável (sempre reflete o estado visível atual).
- **Quem é afetado**: apenas super-admins usando o drawer de movimentos manuais.

## Validação

1. Aba "Total", aplicar filtros, abrir o 1º processo, clicar "Finalizar" → painel troca para o 2º processo da lista sem skeleton de drawer.
2. Repetir até o último processo → ao finalizar o último, painel fecha e toast "Fila concluída" aparece.
3. Aba "Atualizado", abrir um processo, clicar "Marcar como atualizado" → painel permanece aberto no mesmo processo (sem auto-avanço).
4. Clicar "Marcar como atualizado" na aba "Total" sem adicionar movimentos → mesmo auto-avanço.
5. Confirmar que o auto-avanço respeita busca/filtros (OAB, UF, etc.).
