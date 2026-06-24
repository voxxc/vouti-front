## Visão geral

Adicionar uma nova aba **Revisionais** dentro do Planejador, ao lado de "Calendário", visível apenas para o tenant **Solvenza**. Funciona como uma fila de "pré-prazos" criados pela Controladoria (ex.: `Revisional Cliente Xdasilva`) que ficam aguardando atribuição. Ao clicar num card, abre um dropdown com **Editar** e **Atribuir**. Em "Atribuir", escolhe-se o usuário e, em seguida, abre-se o formulário completo de criação de prazo (projeto / processo / protocolo / etapa / data / advogado / tags) — quando confirmado, cria-se um `deadline` real atribuído ao usuário escolhido e o revisional é marcado como atribuído (passando para uma coluna "Atribuídos").

## Modelo de dados

Nova tabela `public.planejador_revisionais` (Lovable Cloud / Supabase):

- `id uuid pk`
- `tenant_id uuid not null` (com FK lógica para tenants)
- `titulo text not null` (ex.: "Revisional Cliente Xdasilva")
- `descricao text`
- `status text not null default 'pendente'` — `pendente | atribuido | arquivado`
- `cliente_nome text` (opcional, para busca rápida)
- `project_id uuid` (opcional — pré-vinculado a um caso)
- `created_by uuid not null` (auth.uid())
- `assigned_to uuid` (preenchido quando atribuído)
- `deadline_id uuid` (FK para `deadlines.id`, preenchido após criar o prazo)
- `atribuido_em timestamptz`
- `created_at`, `updated_at`

RLS: somente membros do tenant podem `SELECT/INSERT/UPDATE/DELETE` (mesmo padrão das demais tabelas do planejador). GRANTs para `authenticated` e `service_role`.

## Visibilidade (gate Solvenza)

Usar o mesmo padrão de `CentralControladoria.tsx`:

```ts
const { tenantSlug } = useTenantNavigation();
const isSolvenza = tenantSlug === 'solvenza';
```

A aba só é renderizada em `PlanejadorTopBar` quando `isSolvenza === true`. A query/inserção respeita RLS, mas a UI fica oculta para outros tenants.

## UI — Aba Revisionais

Arquivo novo: `src/components/Planejador/PlanejadorRevisionaisView.tsx`.

Layout em kanban estilo `PlanejadorPrazosView`, com 2 colunas:
- **Pendentes** (`status = 'pendente'`)
- **Atribuídos** (`status = 'atribuido'`) — mostra usuário responsável e link para o `deadline`

Cada card mostra: título, cliente (se houver), data de criação, criador. Botão `+ Novo Revisional` no topo abre dialog simples (`titulo`, `descricao`, `cliente_nome`, `project_id` opcional).

Clique no card abre `DropdownMenu`:
- **Editar** — abre dialog de edição (mesmos campos do "Novo Revisional").
- **Atribuir** — abre fluxo de atribuição em 2 passos:
  1. Seleção de usuário (lista de profiles do tenant, com busca).
  2. Após confirmar usuário, abre `CreateDeadlineDialog` em modo "atribuir revisional", pré-preenchendo: `title = revisional.titulo`, `advogadoResponsavel = usuário escolhido`, `project_id` (se houver). O usuário define data, processo/protocolo/etapa, tags, etc. — exatamente como um prazo normal.
- **Arquivar** (extra útil) — `status = 'arquivado'` (não aparece nas colunas padrão).

## Reuso do `CreateDeadlineDialog`

Adicionar 2 props opcionais (mantendo retrocompatibilidade):
- `defaultValues?: Partial<DeadlineFormData & { advogadoResponsavel?: string; title?: string }>`
- `onCreated?: (deadlineId: string) => void` (já existe na assinatura).

Em `PlanejadorRevisionaisView`, ao receber `onCreated(deadlineId)` durante a atribuição, executar:
```ts
update planejador_revisionais
set status='atribuido', assigned_to=<userId>, deadline_id=<deadlineId>, atribuido_em=now()
```
e invalidar a query da view.

## Integração no Planejador

1. `PlanejadorTopBar.tsx` — receber prop `showRevisionais: boolean`. Quando true, adiciona `{ id: 'revisionais', label: 'Revisionais' }` à lista `TABS` logo após `calendario`.
2. `PlanejadorDrawer.tsx` — calcular `isSolvenza` via `useTenantNavigation`, passar para o top bar e adicionar branch `activeTab === 'revisionais'` que renderiza `<PlanejadorRevisionaisView />`.

Nenhuma alteração em outros tenants — o branch e a tab não aparecem.

## Hook de dados

Novo `src/hooks/usePlanejadorRevisionais.ts` com React Query:
- `useRevisionais()` — `select * from planejador_revisionais where tenant_id = ? order by created_at desc` (paginação via `fetchAllPaginated`).
- `useCreateRevisional`, `useUpdateRevisional`, `useAtribuirRevisional({ id, userId, deadlineId })`, `useArquivarRevisional`.

## Arquivos afetados

Novos:
- `supabase/migrations/<timestamp>_planejador_revisionais.sql` (tabela + GRANTs + RLS + trigger `updated_at`).
- `src/hooks/usePlanejadorRevisionais.ts`
- `src/components/Planejador/PlanejadorRevisionaisView.tsx`
- `src/components/Planejador/RevisionalDialog.tsx` (criar/editar)
- `src/components/Planejador/RevisionalAtribuirDialog.tsx` (passo 1 — seleção de usuário)

Editados:
- `src/components/Planejador/PlanejadorTopBar.tsx` — nova tab condicional.
- `src/components/Planejador/PlanejadorDrawer.tsx` — gate Solvenza + render da nova view.
- `src/components/Agenda/CreateDeadlineDialog.tsx` — aceitar `defaultValues` para pré-preenchimento (título / advogado / projeto).

## Impacto

1. **UX (usuário final):**
   - Apenas usuários do **tenant Solvenza** verão a nova aba "Revisionais" no Planejador. Nenhum outro tenant será afetado visualmente.
   - Fluxo da Controladoria: cria-se rapidamente um revisional → fica visível para todos do tenant como "Pendente" → qualquer admin/controller pode clicar, escolher usuário e gerar o prazo completo, com toda a riqueza de um prazo normal (projeto, processo/protocolo/etapa, tags, data).
   - Cards atribuídos passam para a coluna "Atribuídos" mostrando responsável + link para o prazo criado (abre `DeadlineDetailDialog` existente).

2. **Dados:**
   - Nova tabela isolada por tenant. Não altera schemas existentes. Pequena (algumas dezenas/centenas de linhas por mês). Sem impacto em performance de queries existentes.
   - `deadlines` continua sendo a fonte única de verdade dos prazos; revisional apenas referencia via `deadline_id`.

3. **Riscos colaterais:**
   - Baixos: alterações em `PlanejadorTopBar` e `PlanejadorDrawer` adicionam um branch condicional, mas mantêm comportamento atual para todos os tenants quando `isSolvenza === false`.
   - Mudança em `CreateDeadlineDialog` é aditiva (props opcionais).

4. **Quem é afetado:**
   - **Solvenza:** todos os usuários enxergam a aba; permissão de criar/atribuir/editar/arquivar é aberta a qualquer membro do tenant (mesmo padrão do Planejador). Se desejar restringir a `controller`/`admin`, basta acrescentar `has_role_in_tenant` nas policies — confirmar antes de implementar.
   - **Outros tenants:** nenhum impacto.

## Validação

- Migration roda e cria tabela com RLS + GRANTs.
- Em outro tenant (qualquer ≠ solvenza): aba "Revisionais" não aparece no top bar.
- Em Solvenza: criar revisional → aparece em "Pendentes" → atribuir → escolher usuário → preencher prazo → confirmar → revisional vira "Atribuído", `deadlines` recebe nova linha com `advogado_responsavel_id` correto, notificação `notifyDeadlineAssigned` disparada (já existe no `CreateDeadlineDialog`).
- Editar revisional pendente atualiza título/cliente/descrição.
- Clicar em revisional atribuído abre o `DeadlineDetailDialog` do prazo gerado.

## Pergunta antes de implementar

Quer que **a criação/atribuição** seja restrita a `controller` + `admin` (mais alinhado ao "usuário da controladoria" que você mencionou), ou aberta a qualquer usuário do tenant Solvenza?