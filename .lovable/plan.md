## Causa raiz

A primeira implementação criou a modal `ConcluirSubtaskModal` apenas para subtarefas do **Planejador** (`planejador_task_subtasks`). Você está testando nas subtarefas de **prazo** (`deadline_subtarefas`), que são as que aparecem em **Controladoria → Central de Subtarefas / Prazos Concluídos** e nos detalhes de prazo. Lá os checkboxes ainda chamam `update` direto na tabela, sem modal e sem registrar comentário.

A tabela `deadline_subtarefas` também não tem hoje uma coluna para guardar o comentário de conclusão.

## Correção

1. **Migration** — adicionar coluna `comentario_conclusao text` em `public.deadline_subtarefas` (nullable; só preenchida quando `concluida = true`). Atualizar a função RPC `get_central_subtarefas` para devolver o novo campo no `jsonb_agg` das subtarefas.

2. **Reaproveitar `ConcluirSubtaskModal`** (já existe e é genérico — recebe título e callback). Aplicar nos pontos onde a subtarefa de prazo é concluída:
   - `src/components/Controladoria/CentralSubtarefas.tsx` → `handleToggleSubtarefa`: se a transição for `false → true`, abrir modal; persistir `concluida=true`, `concluida_em=now()` e `comentario_conclusao` no submit. Desmarcar (true → false) continua direto e limpa `comentario_conclusao`.
   - `src/components/Controladoria/CentralPrazosConcluidos.tsx` → mesma lógica em `handleToggleSubtarefa`.
   - Exibir o comentário abaixo do título da subtarefa quando `concluida` (mesmo padrão visual já usado no Planejador: `✓ {comentario}` em itálico, com tooltip da data).

3. **Tipagem** — incluir `comentario_conclusao?: string | null` na interface `Subtarefa` desses dois arquivos. Não tocar em `src/integrations/supabase/types.ts` (gerado).

Observações:
- O fluxo de **completar o prazo principal** já tem campo de comentário próprio (`AgendaContent.tsx`), portanto não muda. A alteração é exclusiva da conclusão de cada **subtarefa** do prazo.
- A modal já bloqueia o botão "Concluir" quando o textarea está vazio, garantindo que não dá pra concluir sem texto.

## Arquivos afetados

- Nova migration SQL: adicionar coluna + recriar `get_central_subtarefas` incluindo `comentario_conclusao`.
- `src/components/Controladoria/CentralSubtarefas.tsx` — interface `Subtarefa`, `handleToggleSubtarefa`, render do comentário, estado da modal.
- `src/components/Controladoria/CentralPrazosConcluidos.tsx` — mesmas alterações.
- `src/components/Planejador/ConcluirSubtaskModal.tsx` — sem mudanças (já é genérico).

## Impacto

1. **UX / telas / fluxos**: na Central de Subtarefas e Central de Prazos Concluídos, ao marcar o checkbox de uma subtarefa do prazo, abrirá o mesmo modal já usado no Planejador, exigindo um texto para concluir. O comentário aparece logo abaixo da descrição da subtarefa concluída. Desmarcar (reabrir) continua imediato e apaga o comentário.
2. **Dados**: nova coluna `comentario_conclusao text NULL` em `deadline_subtarefas` — não impacta dados existentes (subtarefas antigas concluídas ficam com `NULL`, exibidas sem comentário). RPC `get_central_subtarefas` ganha um campo a mais no JSON; clientes antigos ignoram. RLS e GRANTs existentes da tabela cobrem a nova coluna automaticamente.
3. **Riscos colaterais**: subtarefas já concluídas antes desta mudança não terão comentário (ficam como estão — não vamos forçar retroativamente). Nenhum trigger novo. Sem mudança em `deadlines` nem no fluxo de conclusão do prazo principal.
4. **Quem é afetado**: todos os usuários (todos os tenants) que usam a Controladoria — admin, controller, advogado, financeiro, agenda etc. Sem distinção de papel: a regra de comentário obrigatório vale para qualquer um que conclua a subtarefa.

## Validação

1. Em Controladoria → Central de Subtarefas, marcar uma subtarefa pendente: confirmar que o modal abre, que o botão "Concluir" só habilita com texto e que após confirmar a subtarefa aparece riscada com o comentário em itálico.
2. Desmarcar a mesma subtarefa: deve voltar a pendente sem abrir modal e sem comentário.
3. Repetir o teste em Central de Prazos Concluídos.
4. Recarregar a página: comentário persiste (vem do RPC).
5. Subtarefas já concluídas anteriormente continuam exibindo apenas a data, sem texto — comportamento esperado.
