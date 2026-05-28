## Causa raiz
O erro é de empilhamento/portal de dialogs, não apenas de regra de negócio:

1. `DeadlineDetailDialog` abre o detalhe do prazo com `z-[80]`, mas o `EditarPrazoDialog` usa o `DialogContent` padrão (`z-50`). Então, ao clicar em “Editar”, o editor nasce atrás/embaixo do detalhe do prazo.
2. No Planejador, `PlanejadorTaskDetail` é uma camada própria `absolute z-[60]`. Quando ele abre `EditarPrazoDialog`, o editor também usa `z-50`, ficando abaixo do painel de detalhe da tarefa.
3. Os `AlertDialog` de concluir/reabrir têm `AlertDialogContent z-[100]`, mas o overlay padrão continua em `z-50`; além disso, o detalhe pai ainda compete com a camada ativa durante transições/foco.

## Correção
1. Ajustar `DeadlineDetailDialog` para tratar qualquer ação filha como camada exclusiva:
   - `actionDialogOpen = !!confirmCompleteId || !!reopenDeadlineId || isEditDialogOpen`.
   - Enquanto uma ação estiver aberta, o detalhe do prazo não deve ficar visualmente/interativamente por cima.
   - O botão “Editar” passará a abrir o editor como modal principal, não como modal por baixo do detalhe.

2. Elevar e padronizar a camada do editor de prazo:
   - Permitir que `EditarPrazoDialog` receba uma `contentClassName` opcional ou aplicar nele um z-index alto consistente (`z-[110]`/`z-[120]`).
   - Garantir que `PopoverContent` do calendário e `SelectContent` internos do editor também fiquem acima do próprio editor, para não abrirem “cortados” ou atrás.

3. Corrigir o caso específico do Planejador:
   - Quando `PlanejadorTaskDetail` abrir o editor de um prazo relacionado, o painel da tarefa não deve cobrir o editor.
   - Aplicar z-index alto ao `EditarPrazoDialog` nesse fluxo e, se necessário, desabilitar/ocultar a camada visual do detalhe enquanto o editor estiver aberto.

4. Fortalecer os dialogs de confirmação:
   - Subir também o overlay dos `AlertDialog` de concluir/reabrir/excluir quando usados dentro de detalhe de prazo/tarefa.
   - Evitar que o detalhe pai capture clique/foco enquanto o modal de confirmação está aberto.

## Arquivos afetados
- `src/components/Agenda/DeadlineDetailDialog.tsx`
  - Controle de camada ativa para concluir, reabrir e editar.
  - Ajuste do `EditarPrazoDialog` chamado pelo detalhe.
  - Ajuste dos `AlertDialogContent` e possível overlay class.

- `src/components/Agenda/EditarPrazoDialog.tsx`
  - Aceitar classe opcional para camada do conteúdo.
  - Subir `PopoverContent` e `SelectContent` internos acima do dialog.

- `src/components/Planejador/PlanejadorTaskDetail.tsx`
  - Garantir que o editor de prazo relacionado abra acima do detalhe da tarefa.
  - Ajustar camada dos confirmations dentro do detalhe da tarefa.

- Possivelmente `src/components/ui/alert-dialog.tsx`
  - Se necessário, permitir `overlayClassName` no `AlertDialogContent` para controlar overlay e conteúdo juntos sem hacks locais.

## Impacto
1. **Usuário final:** ao concluir, reabrir, excluir ou editar prazos pelo Planejador ou Dashboard, o modal correto aparece na frente, centralizado e clicável. O editor de prazo não abre mais “feio” por baixo do detalhe.
2. **Dados:** nenhuma migration, RLS ou alteração de schema. A conclusão, reabertura, edição, comentários de auditoria, tags e notificações continuam usando as mesmas tabelas e updates atuais.
3. **Riscos colaterais:** baixo a moderado. A mudança afeta empilhamento e foco de dialogs compartilhados por Agenda/Planejador; precisa validar calendário/select dentro do editor para não criar regressão visual.
4. **Quem é afetado:** usuários que editam/concluem/reabrem prazos pela Agenda, Dashboard/Planejador e detalhe de tarefa do Planejador; principalmente admin, controller, agenda e advogados.

## Validação
1. Abrir Planejador pelo dashboard e clicar em um prazo.
2. No detalhe do prazo, clicar em “Marcar como Concluído” e confirmar que o modal aparece acima de tudo, aceita digitação e conclui sem erro.
3. No detalhe do prazo, abrir “Editar” e confirmar que o editor aparece acima do detalhe, com calendário e selects abrindo corretamente.
4. Abrir uma tarefa do Planejador com prazos relacionados e clicar no ícone de editar prazo; confirmar que o editor aparece acima do painel da tarefa.
5. Testar reabrir prazo concluído e excluir prazo/tarefa para confirmar que os confirmations não ficam atrás.