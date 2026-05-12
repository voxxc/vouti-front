## Causa raiz

O prazo existe normalmente (`module='legal'`, data 22/05/2026, não concluído, tenant correto) e a RLS de `deadlines` libera SELECT para 4 papéis: **criador (`user_id`)**, **advogado (`advogado_responsavel_id`)**, **concluído_por** e **taggeados**.

- Dentro do **Projeto**, a lista de prazos respeita só a RLS — então o usuário vê.
- Na **Agenda** (`src/components/Agenda/AgendaContent.tsx`, linhas 587-594), há um filtro client-side adicional que considera **apenas advogado ou tagged**, ignorando criador e concluído_por.

Neste prazo: `user_id=7d88feb9…` (criador) e `advogado=158daf46…`. Se o usuário logado é o criador mas não o advogado nem está taggeado, a RLS o autoriza (aparece no projeto), mas o filtro da Agenda esconde.

Já existe no mesmo arquivo a função `isUserParticipant` (linha 581) que cobre os 4 papéis corretamente — só é usada para a seção "Concluídos". A divergência é local.

## Correção

1. Em `AgendaContent.tsx`, substituir o predicado de `filteredDeadlines` (linhas 587-594) para usar `isUserParticipant` (criador + advogado + tagged + concluído_por), igual já é feito em "Concluídos".
2. Aplicar o mesmo critério ao filtro `selectedUserFilter` (passar a usar `isUserParticipant(deadline, selectedUserFilter)`).
3. Revisar e padronizar o mesmo critério, se houver o bug, em:
   - `src/components/Dashboard/PrazosAbertosPanel.tsx`
   - `src/components/Dashboard/Metrics/AdvogadoMetrics.tsx`
   - `src/components/Dashboard/Metrics/FinanceiroMetrics.tsx`
   - `src/components/Dashboard/PrazosDistributionChart.tsx`

## Arquivos afetados

- `src/components/Agenda/AgendaContent.tsx` (correção principal)
- Os 4 arquivos do Dashboard acima (revisão; ajuste só se reproduzirem o mesmo padrão restrito)
- **Sem migration. Sem alteração de RLS.**

## Impacto

1. **Usuário final**: prazos em que o usuário é apenas o **criador** passam a aparecer na Agenda dele (idêntico ao que já mostra no projeto). Acaba a inconsistência "vejo no projeto mas não na agenda". Filtro "por usuário" passa a refletir todos os papéis de participação.
2. **Dados**: nenhuma mudança em schema, RLS ou performance (filtro continua O(n) sobre dados já carregados).
3. **Riscos colaterais**: usuários que criam muitos prazos para terceiros podem ver a Agenda mais "cheia" — é o comportamento correto. Nenhum dado novo é exposto: a RLS já liberava esses prazos.
4. **Quem é afetado**: todos os perfis que criam prazos para outros (controladoria, comercial, admin delegando, etc.) em todos os tenants. Admin/controller: comportamento inalterado (já viam tudo).

## Validação

- Logar como o criador do prazo `16b84fd9-8ea0-4805-a114-9f3db7e22c17` → deve aparecer em "Próximos" e no calendário da Agenda.
- Logar como o advogado `158daf46…` → continua aparecendo (regressão).
- Logar como usuário sem vínculo → **não** aparece (RLS continua bloqueando).
- Trocar o filtro de usuário entre criador, advogado e "todos" → todos devem mostrar o prazo.
- Conferir Dashboard `PrazosAbertosPanel` com o usuário criador.
