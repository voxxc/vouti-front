## Causa raiz
Hoje o dialog "Nova Revisional" cria apenas o registro em `planejador_revisionais` (título, descrição, cliente, projeto). O prazo de conclusão só pode ser definido depois, pelo fluxo "Atribuir". O usuário quer já poder anexar um prazo no momento da criação, e quer que a listagem priorize revisionais com prazo mais próximo no topo.

## Correção

### 1. Dialog de criação ganha bloco opcional "Prazo de conclusão"
No `CreateRevisionalDialog` (dentro de `PlanejadorRevisionaisView.tsx`), adicionar abaixo dos campos atuais:
- Switch/checkbox **"Definir prazo de conclusão agora"** (desligado por padrão).
- Quando ligado, exibir os mesmos campos do `CreateDeadlineDialog` usado nas etapas: 
  - Data (Popover + Calendar) **obrigatória**
  - Responsável (`AdvogadoSelector`) **obrigatório**
  - Marcar outros usuários (`UserTagSelector`)
  - Categoria (`Select` com `DEADLINE_CATEGORIES`)
  - Vínculo opcional com **Projeto / Protocolo / Etapa** (reaproveitar selects já existentes — o projeto já é escolhido no topo do dialog; abaixo dele, se houver projeto, listar protocolos e etapas via hooks já usados no Planejador).
- Botão primário muda de "Criar" para "Criar revisional + prazo" quando o switch está ligado.

### 2. Fluxo de criação combinado
Ao confirmar:
1. Criar a revisional via `useCreateRevisional` (igual hoje).
2. Se o switch estiver ligado, criar imediatamente um `deadline` (mesma lógica de `Project/CreateDeadlineDialog`: insert em `deadlines`, tags em `deadline_tags`, notificações via `notifyDeadlineAssigned` / `notifyDeadlineTagged`, histórico se houver etapa).
3. Atualizar a revisional setando `deadline_id`, `assigned_to = advogado`, `status = 'atribuido'`, `atribuido_em = now()` (reaproveitando `useAtribuirRevisional`).
4. Toast único de sucesso e fechar dialog.

Se o usuário não marcar a opção, comportamento atual permanece (revisional fica `pendente`, sem prazo).

### 3. Ordenação da fila por urgência
Em `PlanejadorRevisionaisView`:
- Hoje cada coluna (Pendentes / Atribuídos / Arquivados) ordena por `created_at desc`.
- Trocar a ordenação por uma função que olha `deadline_id` da revisional e, quando existir, busca a `date` do prazo correspondente. Para isso, adicionar ao `useRevisionais` um join leve: estender o `select` para `*, deadline:deadlines!planejador_revisionais_deadline_id_fkey(id,date,completed)` (FK já existe). Sem mudança de schema.
- Regra de ordenação aplicada por coluna:
  1. Revisionais **com prazo não concluído**, ordenadas por `deadline.date` ascendente (mais urgente primeiro; vencidas no topo).
  2. Revisionais **sem prazo**, ordenadas por `created_at` descendente.
  3. Revisionais com prazo já concluído vão ao final.
- Exibir um chip no `RevisionalCard` com a data do prazo e destaque visual (`text-destructive`) quando vencido / hoje.

### 4. Viewer reflete o novo vínculo
No `RevisionalViewerDialog`, quando a revisional tiver `deadline_id`, mostrar a data do prazo e manter o link "Ver prazo" existente.

## Arquivos afetados
- `src/components/Planejador/PlanejadorRevisionaisView.tsx` — adicionar campos de prazo no `CreateRevisionalDialog`, lógica combinada de criação, ordenação por urgência, chip de data no `RevisionalCard`, exibição no viewer.
- `src/hooks/usePlanejadorRevisionais.ts` — estender `select` do `useRevisionais` para trazer `deadline { id, date, completed }`; expandir a interface `Revisional`.
- Reaproveitamento (sem alterar): `AdvogadoSelector`, `UserTagSelector`, `DEADLINE_CATEGORIES`, helpers de notificação e `parseLocalDate`.

Nenhuma migration: as colunas `deadline_id`, `assigned_to`, `status`, `atribuido_em` em `planejador_revisionais` e a tabela `deadlines` já existem.

## Impacto
- **Usuário final (controladoria Solvenza):** o dialog "Nova Revisional" passa a ter um bloco opcional "Definir prazo agora" com data, responsável, marcações e categoria. Se preenchido, a revisional já nasce **Atribuída** e com prazo vinculado, dispensando o passo extra "Atribuir". A fila de Pendentes/Atribuídos passa a mostrar primeiro o que vence antes (vencidas no topo, em vermelho), e por último o que não tem prazo. Card ganha um chip com a data do prazo.
- **Dados:** nenhuma migration. Os inserts adicionais usam tabelas já existentes (`deadlines`, `deadline_tags`) com o mesmo padrão dos outros fluxos (tenant_id, workspace_id resolvido, project_id quando informado). O `select` da lista de revisionais cresce com um join para `deadlines` (1 linha por revisional, custo desprezível).
- **Riscos colaterais:** se a criação do prazo falhar após a revisional ser criada, a revisional fica como `pendente` sem prazo (estado válido) e mostramos toast de erro do prazo — sem rollback explícito, mas o usuário pode atribuir depois. A ordenação muda o que aparece no topo das colunas; quem estava acostumado com "mais recente primeiro" vai ver "mais urgente primeiro" — comportamento esperado pelo pedido.
- **Quem é afetado:** apenas o tenant Solvenza (a aba Revisionais já está gated para esse tenant). Demais tenants não veem nada.

## Validação
1. Abrir Planejador → Revisionais (Solvenza) → "Nova Revisional", deixar switch desligado → cria revisional `pendente`, sem prazo, comportamento atual.
2. Repetir com switch ligado, preencher data + responsável → conferir que aparece em "Atribuídos", com chip de data, e que existe registro em `deadlines` com `advogado_responsavel_id` e `tenant_id` corretos.
3. Criar 3 revisionais com datas diferentes (uma vencida, uma futura, uma sem prazo) → conferir ordem: vencida no topo, futura no meio, sem prazo no fim.
4. Marcar o prazo como concluído na Agenda → conferir que a revisional cai para o final da coluna.
5. Rodar `tsgo` para garantir tipos do novo campo `deadline` no hook.
