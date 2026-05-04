Identifiquei por que “nada ainda” mudou no print atual.

O modal que você está vendo ainda vem do fluxo do workspace/protocolo, e a consulta desse fluxo continua trazendo os prazos sem `user_id`, `created_at` e `updated_at`. O próprio network log confirma isso: o prazo nº 910 está sendo carregado com `id`, `title`, `date`, `deadline_number`, etc., mas sem `user_id` e sem `created_at`. No banco, esses dados existem:

- Prazo nº 910: `created_at = 2026-04-27 19:32:36`
- Criado por: `Izabelita Beatriz`

Plano de correção:

1. Corrigir a consulta do workspace/protocolo
   - Em `ProjectProtocoloContent.tsx`, incluir `user_id`, `created_at` e `updated_at` no `select` de `fetchPrazosVinculados`.
   - Incluir também o perfil do criador, usando o relacionamento `profiles` do `user_id` quando possível.
   - Isso resolve o caso exato do print, porque hoje esse payload chega incompleto.

2. Remover estados/lógica antiga que não deveriam mais controlar o modal
   - Limpar estados e funções antigas do modal inline em `ProjectProtocoloContent.tsx` que ainda ficaram depois da troca para `DeadlineDetailDialog`.
   - O clique no prazo deve apenas abrir `DeadlineDetailDialog` por `deadlineId`, para garantir que o workspace use exatamente o mesmo componente visual da agenda.

3. Tornar o `DeadlineDetailDialog` mais robusto
   - Buscar `user_id`, `created_at` e `updated_at` explicitamente no detalhe.
   - Buscar o perfil do criador pelo `profiles.user_id` e usar fallback por e-mail/nome quando o nome não vier.
   - Renderizar sempre:
     - `Criado por`: nome do usuário ou `Usuário` se só houver ID.
     - `Criado em`: `dd/MM/yyyy às HH:mm`, ou `—` se realmente não existir.

4. Corrigir também o modal inline da Agenda
   - Em `AgendaContent.tsx`, alterar a renderização atual que ainda depende de `createdByName` e `createdAt` para ficar igual à lógica robusta do `DeadlineDetailDialog`.
   - Assim, agenda, dashboard, controladoria, planejador e workspace ficam consistentes.

5. Ajustar o carregamento do AgendaDrawer, se necessário
   - `AgendaDrawer` aceita `initialDeadlineId`, mas `DashboardLayout` não repassa esse valor no drawer global.
   - Vou revisar e corrigir esse repasse se estiver afetando algum clique vindo do dashboard/agenda.

Resultado esperado:

- Ao abrir o prazo nº 910 pelo workspace, deve aparecer:
  - `Criado por` → Izabelita Beatriz
  - `Criado em` → 27/04/2026 às 19:32
- A janela de detalhes pelo workspace ficará igual à da agenda.
- Todos os prazos passam a exibir data/hora de criação quando o banco tiver esse dado.