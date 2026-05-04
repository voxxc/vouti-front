Vou corrigir isso em dois pontos para eliminar a divergência que ainda aparece no workspace e garantir que o criador/data sempre sejam exibidos.

1. Remover de vez o diálogo antigo do workspace/protocolo
- O replay mostra que a janela ainda está vindo de `ProjectProtocoloContent.tsx` com o layout antigo (`DESCRIÇÃO`, `DATA`, `PROJETO`, `CLIENTE`, `RESPONSÁVEL`, card azul de `Caso Vinculado`).
- Vou substituir/garantir esse render pelo componente único `DeadlineDetailDialog`, que é o mesmo usado como padrão na Agenda.
- Também vou limpar os imports/estados/funções antigas que mantêm esse diálogo antigo vivo, para evitar que o preview continue abrindo a versão errada.

2. Garantir que o payload/listagem do workspace traga auditoria do prazo
- Na busca dos prazos vinculados em `ProjectProtocoloContent.tsx`, vou incluir `created_at`, `updated_at` e `user_id` no select.
- Mesmo usando `DeadlineDetailDialog` por `deadlineId`, isso evita dados incompletos nos cards/listas e em qualquer fallback interno.

3. Corrigir o carregamento do criador no detalhe
- Em `DeadlineDetailDialog.tsx`, vou tornar a busca do perfil do criador mais robusta:
  - buscar `profiles` por `user_id = deadlines.user_id`;
  - se não encontrar nome, exibir fallback como `Usuário`/email quando disponível, em vez de simplesmente esconder o campo;
  - manter avatar quando existir.
- A seção `Criado por` deixará de depender de nome perfeito para aparecer; se existir `user_id`, o campo aparece.

4. Garantir data e hora de criação em todos os detalhes
- Em `DeadlineDetailDialog.tsx`, vou exibir `Criado em` sempre que `created_at` existir, formatado como `dd/MM/yyyy às HH:mm`.
- Vou evitar fallback enganoso para `new Date()` quando `created_at` vier vazio; se estiver ausente no banco, isso ficará claro em vez de mostrar a data atual incorretamente.
- Em `AgendaContent.tsx`, vou manter/adaptar a mesma lógica para a janela inline da Agenda enquanto ela ainda existir.

5. Padronizar visual
- A janela aberta pelo workspace passará a ter o mesmo layout/tabs da janela padrão da Agenda.
- A seção de auditoria ficará visível no final da aba `Informações`:
  - `Criado por` com avatar/inicial;
  - `Criado em` com data e hora.

Resultado esperado: ao abrir qualquer prazo pelo workspace ou pela Agenda, a janela exibirá o mesmo detalhe e mostrará quem criou o prazo e quando foi criado.