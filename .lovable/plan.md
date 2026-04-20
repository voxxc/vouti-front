

## Teste visual: topbar liso e integrado ao sidebar — apenas tenant `demorais`

### Referência (imagem Astrea)
- Topbar **sem linha divisória inferior** — fundo branco contínuo.
- Sidebar com fundo idêntico ao topbar — não há borda horizontal separando os dois; visualmente "fundem".
- Borda vertical sutil só **à direita do sidebar**, separando do conteúdo.
- Conteúdo principal (área cinza clara) é o único que destaca por contraste de fundo.

### Estado atual (Vouti)
- `header` em `DashboardLayout.tsx`: `sticky top-0 z-30 border-b glass-surface` com altura `h-[52px]`.
- `aside` do `DashboardSidebar.tsx`: `glass-surface border-r border-border/60`, e o bloco do logo tem `border-b border-border/60` (linha que cria a "quebra" visual entre logo e itens).
- Resultado: 3 linhas visíveis (header bottom, logo bottom do sidebar, divisor após "Suporte").

### Mudança proposta (escopo: somente quando `tenantSlug === 'demorais'`)

**1. Detectar tenant no Layout e Sidebar**
- Em `DashboardLayout.tsx` já existe `const { tenant: tenantSlug } = useParams()`. Criar `const isFlatTopbar = tenantSlug === 'demorais'`.
- Passar essa flag como prop opcional `flatTopbar?: boolean` para `DashboardSidebar` (também já tem `useParams`, mas centralizar via prop garante consistência).

**2. Header (`DashboardLayout.tsx`, linha 411)**
- Quando `isFlatTopbar`, trocar classes:
  - Remover `border-b` e `glass-surface`.
  - Aplicar `bg-background` (mesma cor do sidebar para "fundir").
  - Manter `sticky top-0 z-30 h-[52px]`.
- Quando NÃO `isFlatTopbar`: manter classes atuais (nenhuma regressão para outros tenants).

**3. Sidebar (`DashboardSidebar.tsx`)**
- Quando `flatTopbar`:
  - `aside`: trocar `glass-surface` por `bg-background`. Manter `border-r border-border/60` (essa borda vertical é desejada — separa sidebar do conteúdo, igual à referência).
  - Bloco do logo (linha 186-189): remover `border-b border-border/60` (some a linha horizontal que quebrava a continuidade com o topbar).
  - Divisores de "Suporte" e "Collapse Toggle" (linhas 281, 296): manter, ou trocar para `border-border/30` mais sutil — opcional, decidir na hora.
- Quando NÃO `flatTopbar`: nenhuma mudança (atual).

**4. Conteúdo principal**
- Para reforçar o contraste estilo Astrea (área central levemente cinza), opcionalmente aplicar `bg-muted/20` na div `flex-1 flex flex-col` (linha 409) **somente** quando `isFlatTopbar`. Sem mudar background do `min-h-screen` global. Decidir após primeira passada se está bom sem isso.

### Arquivos afetados

- **`src/components/Dashboard/DashboardLayout.tsx`**: detectar `isFlatTopbar`, ajustar classes do `<header>`, passar prop pro sidebar.
- **`src/components/Dashboard/DashboardSidebar.tsx`**: aceitar prop `flatTopbar`, ajustar classes do `<aside>` e do bloco do logo.
- **Nenhuma migration, nenhum hook, nenhum componente novo.**

### Impacto

- **Usuário final (UX)**: apenas usuários do tenant `demorais` (rota `/demorais/*`) verão o novo visual: topbar sem borda inferior, fundo contínuo entre topbar e sidebar, aspecto mais "limpo/Astrea-like". Todos os outros tenants (`solvenza`, `vouti`, etc.) continuam com o visual glass atual — zero regressão.
- **Dados**: nenhuma alteração de DB, RLS, schema. Mudança 100% cosmética e condicional por slug.
- **Riscos colaterais**:
  - `glass-surface` aplica blur + alpha; trocá-lo por `bg-background` no demorais pode parecer "menos premium" no tema escuro — vale checar nos dois temas.
  - Como o teste é por slug, se algum dia o tenant mudar de slug, o visual reverte automaticamente. Quando virar padrão Vouti, basta remover o condicional.
- **Quem é afetado**: somente usuários autenticados que navegam em rotas `/demorais/*` no Dashboard. CRM standalone (`/crm/:tenant`) não é afetado nesta etapa (escopo só Dashboard, conforme imagem). Se quiser estender depois para CRM, é trivial replicar em `CRMTopbar.tsx`.

### Validação

1. Logar no tenant `demorais` → `/demorais/dashboard`: topbar **sem linha** entre header e sidebar; logo do sidebar continua sem linha embaixo; fundo contínuo.
2. Abrir em tema claro e tema escuro — conferir contraste e legibilidade.
3. Logar/navegar em outro tenant (ex: `/solvenza/dashboard`): visual antigo intacto (border-b + glass).
4. Navegar para drawers (Projetos, Agenda, etc.) dentro do `demorais`: topbar segue sem borda; drawers abrem normalmente.
5. Mobile (< 768px): topbar continua funcional, sem linha visível.
6. Recolher sidebar (`isCollapsed`): conexão visual com o topbar permanece consistente.
7. Confirmar com usuário: se aprovar, próximo passo é remover o condicional e tornar padrão para todo o Vouti (e replicar no CRM standalone).

