

## Causa raiz / Justificativa

Vamos começar o redesign Apple-style pelo **Dashboard** (`/solvenza/dashboard`) como protótipo da nova linguagem visual. Validamos a direção numa tela só, ajustamos o que precisar, e depois replicamos pros outros módulos.

## Exploração necessária antes de implementar

Preciso ler os componentes que renderizam no dashboard atual pra mapear exatamente o que vai mudar:
- `src/pages/Dashboard.tsx` (já tenho)
- `src/components/Dashboard/RoleMetricsPanel.tsx` (renderiza métricas por role)
- `src/components/Dashboard/DashboardLayout.tsx` (sidebar + topbar)
- Cards específicos: `ClienteValoresCard`, `TasksMetrics`, etc.
- `src/index.css` e `tailwind.config.ts` (tokens atuais)

## O que vai mudar no Dashboard (Apple-style)

### 1. Layout geral
- **Topbar translúcida** com `backdrop-blur-xl` + borda inferior sutil (estilo macOS).
- **Sidebar** com fundo levemente translúcido, item ativo vira **pílula arredondada** com fundo suave (não barra colorida cheia).
- Mais respiro entre seções (`gap-6` → `gap-8`).

### 2. Headers de página
- Título principal: `text-3xl font-semibold tracking-tight` (estilo SF Pro).
- Subtítulo cinza médio, peso normal.
- Hierarquia tipográfica clara, menos negrito.

### 3. Cards de métricas (KPIs)
- `rounded-2xl` (14-16px) em vez de `rounded-lg`.
- Sombra **muito sutil** (`shadow-sm` com opacidade baixa) ou **sem sombra**, só borda fina.
- Padding mais generoso (`p-6`).
- Números grandes com `font-semibold` (não bold), tracking apertado.
- Ícone num "container" arredondado pequeno com fundo da cor temática a 10% de opacidade (estilo iOS).

### 4. Cards com listas/gráficos
- Mesmo tratamento: cantos arredondados, sombras sutis, headers limpos.
- Barras de progresso já refinamos (manter o estilo minimalista atual).
- Gráficos Recharts: paleta mais dessaturada, grid mais sutil.

### 5. Cores refinadas
- Azul primário ligeiramente menos saturado (estilo iOS blue: `#0A84FF` em vez de azul puro saturado).
- Cinzas com leve toque azulado (warmer grays).
- Dark mode: cinza-azulado escuro em vez de preto puro.

### 6. Micro-interações
- Hover em cards clicáveis: leve `scale-[1.01]` + sombra que cresce sutilmente.
- Transições com `cubic-bezier(0.4, 0, 0.2, 1)` (já existe).

## Escopo desta etapa

**Apenas o Dashboard** (`/solvenza/dashboard`):
- `Dashboard.tsx` + `RoleMetricsPanel.tsx` + cards de métricas que renderizam dentro dele
- Topbar e sidebar do `DashboardLayout` (já que aparecem na tela)
- **Não mexer ainda** em: Planejador, Controladoria, CRM, Agenda, Financeiro, módulos internos.

## Tokens novos (escopo Dashboard, mas reutilizáveis depois)

Adicionar em `index.css`:
- `.glass-surface` — backdrop-blur + bg semi-transparente para topbar/sidebar.
- `--shadow-apple-sm`, `--shadow-apple-md` — sombras refinadas.
- Refinar paleta primária (azul levemente menos saturado).

## Arquivos afetados

- `src/index.css` — novos tokens (glass, sombras refinadas), refinamento de cores primárias.
- `src/pages/Dashboard.tsx` — header, espaçamento.
- `src/components/Dashboard/DashboardLayout.tsx` — topbar/sidebar com glass.
- `src/components/Dashboard/RoleMetricsPanel.tsx` — refinamento dos KPIs.
- Cards de métricas usados pelo role atual (admin/advogado/etc) — vou identificar lendo o `RoleMetricsPanel`.
- `src/components/ui/card.tsx` — variante "apple" opcional (rounded-2xl, sombra sutil) **OU** classe utilitária — decidir lendo o código.

## Impacto

- **Usuário final (UX)**:
  - Dashboard fica visivelmente mais **premium, leve e moderno**, sem mudar fluxos ou onde clicar.
  - Topbar translúcida dá sensação macOS.
  - KPIs ficam com aparência iOS (containers de ícone coloridos, números refinados).
  - Resto do sistema continua igual até replicarmos a linguagem.
- **Dados**: zero mudanças.
- **Performance**: `backdrop-blur` na topbar/sidebar tem custo leve de GPU — imperceptível em hardware moderno. Vou usar com moderação (só superfícies elevadas).
- **Riscos colaterais**:
  - Mudança nos tokens primários (`--primary`) afeta **todo o sistema** — botões, links, focus rings em outros módulos terão um azul levemente diferente. Isso é **bom** (consistência), mas se algum lugar dependia da saturação alta vou ajustar.
  - Cards que usavam classes hardcoded (`bg-white`, sombras específicas) vão ficar visualmente desalinhados temporariamente — fica claro o que falta migrar nas próximas fases.
  - Inconsistência momentânea entre Dashboard (novo visual) e resto do sistema (antigo) — esperado, é uma migração incremental.
- **Quem é afetado**:
  - Tenants do sistema jurídico (Solvenza e todos os outros) ao acessar Dashboard.
  - Veridicto, Vouti.co landing, VoTech, Vouti Link-in-Bio: **não afetados** (têm identidades próprias e não usam o `DashboardLayout`).

## Validação

1. Abrir `/solvenza/dashboard` em desktop → confirmar topbar translúcida, sidebar refinada, KPIs com cantos mais arredondados e ícones em containers coloridos.
2. Testar em viewport 736px (atual do usuário) → tudo responsivo, sem quebra.
3. Alternar dark mode → contraste ok, glass funciona, cores refinadas legíveis.
4. Trocar de role (admin/advogado/comercial) → cada `RoleMetricsPanel` mantém visual consistente.
5. Navegar pra outras páginas (Planejador, CRM) → confirmar que **nada quebrou** (tokens novos não causaram efeito colateral negativo).

## Próximo passo após aprovação

1. Ler `RoleMetricsPanel.tsx`, `DashboardLayout.tsx` e cards relacionados pra mapeamento exato.
2. Implementar tokens no `index.css`.
3. Aplicar visual nos componentes do Dashboard.
4. Validar com screenshots/preview e ajustar antes de propor Fase 2 (componentes shadcn globais).

