# Conclusão de subtarefa com comentário obrigatório

## Causa / Contexto
Hoje, marcar uma subtarefa como concluída é um clique simples no checkbox (`PlanejadorTaskDetail.tsx`, duas seções) ou ao arrastar o card-subtask para a coluna "Concluído" no Kanban (`PlanejadorDrawer.tsx`). Não há registro de o que foi feito.

## Correção
1. **Banco**: adicionar coluna `comentario_conclusao text` e `concluida_em timestamptz` em `planejador_task_subtasks`. Sem default; preenchida só quando `concluida = true`.
2. **Hook `usePlanejadorSubtasks`**: `toggle` passa a aceitar `{ id, concluida, comentario_conclusao? }`. Ao concluir, grava o comentário e `concluida_em = now()`. Ao reabrir, limpa ambos.
3. **Novo componente `ConcluirSubtaskModal`** (espelhando `ConcluirEtapaModal`): textarea obrigatório, botões "Cancelar" / "Concluir subtarefa". Sem texto preenchido, botão fica desabilitado.
4. **`PlanejadorTaskDetail.tsx`** (2 listas de subtarefas): ao clicar no checkbox para marcar como concluída, abrir o modal em vez de chamar `toggle` direto. Desmarcar (reabrir) continua sem modal. Exibir o `comentario_conclusao` em texto pequeno e discreto abaixo do título da subtarefa concluída, com tooltip de data.
5. **`PlanejadorDrawer.tsx`** (drag-and-drop do card-subtask para coluna `concluido`): interceptar o drop, abrir o mesmo modal e só persistir após confirmação. Cancelar = card volta à coluna anterior.
6. **Activity log**: incluir o comentário no payload de `subtask_completed` para aparecer no histórico da tarefa-pai.

## Arquivos afetados
- Migration nova (coluna + comentário)
- `src/hooks/usePlanejadorSubtasks.ts`
- `src/components/Planejador/ConcluirSubtaskModal.tsx` (novo)
- `src/components/Planejador/PlanejadorTaskDetail.tsx`
- `src/components/Planejador/PlanejadorDrawer.tsx`

## Impacto
- **UX**: concluir subtarefa exige um passo a mais (modal com texto). Reabrir permanece 1 clique. Usuário vê o que foi entregue em cada subtarefa direto na lista.
- **Dados**: 2 colunas novas, nullable; subtarefas antigas já concluídas ficam sem comentário (legado, sem migração retroativa). Sem mudanças de RLS.
- **Riscos colaterais**: drag-and-drop no Kanban precisa de rollback visual ao cancelar — tratado no item 5. Nenhuma quebra em `PlanejadorTaskCard` (só usa contagem).
- **Quem é afetado**: todos os usuários do Planejador, todos os tenants.

## Validação
- Marcar subtarefa sem texto: botão desabilitado.
- Concluir com texto: comentário aparece na lista e em `planejador_task_activity_log`.
- Reabrir subtarefa: comentário e `concluida_em` voltam a NULL.
- Arrastar card-subtask para "Concluído" no Kanban: abre modal; cancelar mantém na coluna original.
