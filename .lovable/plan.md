## Causa raiz

As notificações da Fabieli são todas do tipo `lead_comment` (comentários de leads do módulo Reuniões/CRM). Há dois problemas combinados:

1. **Trigger não preenche referência** — As funções `notify_lead_creator_on_reuniao_comentario` e `notify_lead_creator_on_cliente_comentario` inserem em `notifications` sem `related_task_id` nem `related_project_id`. Resultado: a notificação não sabe qual lead abrir.
2. **`NotificationCenter` não trata `lead_comment`** — Em `handleNotificationClick` não existe nenhum `case` para `lead_comment`. Como `related_project_id` é `null`, o fallback default `if (notification.related_project_id && onProjectNavigation)` não dispara. A notificação é só marcada como lida e nada abre. É exatamente o que a Fabieli está vendo.

## Correção

### 1. Backend (migration)
- Atualizar as duas funções do trigger para incluir `related_task_id = cliente_id` (o id do lead em `reuniao_clientes`) na inserção em `notifications`.
- Backfill best-effort das notificações `lead_comment` antigas da Fabieli (e de todos os tenants): para cada notificação onde `related_task_id IS NULL`, tentar localizar `reuniao_clientes.id` pelo `tenant_id` + nome extraído do `title`/`content` (prefixo antes do `:`). Quando houver match único, gravar. Quando não houver, deixar como está (o frontend cai num fallback que abre a lista de leads).

### 2. Frontend — `NotificationCenter.tsx`
- Adicionar prop `onLeadNavigation?: (leadId: string) => void`.
- Em `handleNotificationClick`, antes do fallback default, tratar `type === 'lead_comment'`:
  - Se `related_task_id` existir → `onLeadNavigation(related_task_id)`.
  - Caso contrário → `onLeadNavigation('')` (abre só a tela de Reuniões).
- Adicionar emoji no `getNotificationIcon` para `lead_comment`.

### 3. Frontend — `DashboardLayout.tsx`
- Passar `onLeadNavigation={(leadId) => navigate(tenantPath('/reunioes' + (leadId ? `?cliente=${leadId}` : '')))}`.

### 4. Frontend — `ReunioesContent.tsx`
- Ler `useSearchParams()`, se `cliente` estiver presente: carregar o cliente correspondente (já está em `clientes`, ou via fetch) e abrir `ClienteDetalhesDialog` automaticamente. Limpar o param depois para não reabrir ao navegar.

## Arquivos afetados
- `supabase/migrations/<novo>.sql` (atualizar 2 funções + backfill)
- `src/components/Communication/NotificationCenter.tsx`
- `src/components/Dashboard/DashboardLayout.tsx`
- `src/components/Reunioes/ReunioesContent.tsx`

## Impacto

**Usuário final (UX/telas/fluxos):**
- Clicar numa notificação "Novo comentário no lead" agora navega para `/reunioes` e abre automaticamente o `ClienteDetalhesDialog` do lead correspondente, mostrando histórico e comentários.
- Antes: o clique apenas marcava como lida e o popover fechava — sensação de "notificação quebrada" (relato da Fabieli).
- Aplicável a qualquer comercial/admin que recebe `lead_comment` (Fabieli é o caso reportado, mas todos os tenants do CRM ganham o fix).

**Dados (migrations/RLS/perf):**
- Migration apenas reescreve duas funções `SECURITY DEFINER` e roda um `UPDATE` único na tabela `notifications`. Sem mudança de schema, sem RLS, sem GRANT novo.
- Backfill toca só linhas com `type='lead_comment' AND related_task_id IS NULL` — volume pequeno (dezenas/centenas), executa em segundos.
- Notificações novas passam a carregar `related_task_id` (já existe a coluna).

**Riscos colaterais:**
- O backfill por nome pode marcar o lead errado quando dois leads no mesmo tenant têm o mesmo nome — por isso só grava em match único; o resto fica intocado e cai no fallback (abre só `/reunioes`). Sem regressão.
- Deep link em `/reunioes?cliente=...` precisa limpar o searchParam para não reabrir o dialog em refresh — tratado no `useEffect`.

**Quem é afetado:**
- Todos os usuários do módulo Reuniões que recebem comentários em leads que criaram (Fabieli, demais comerciais, admin). Nenhum outro tipo de notificação muda. Sem impacto em outros tenants/módulos.

## Validação
1. Rodar migration → conferir definição das funções e contagem de linhas atualizadas no backfill.
2. Logar como Fabieli → sino → clicar numa notificação `lead_comment` recente (backfill) → confere que abre `/solvenza/reunioes` com o `ClienteDetalhesDialog` do lead certo aberto.
3. Criar um novo comentário num lead da Fabieli a partir de outra conta → notificação chega com `related_task_id` populado → clique abre o dialog correto.
4. Conferir que clicar em notificações de outros tipos (`comment_mention`, `deadline_assigned`, etc.) continua funcionando exatamente como antes.