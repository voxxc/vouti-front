

## Fase 3 — Refinamento do Dashboard (charts, formulários, empty states)

### Causa raiz / Justificativa

Fases 1 e 2 estabeleceram tokens, KPIs do Dashboard e refinaram componentes shadcn globais. Agora **Fase 3** foca em polir o **interior do Dashboard** — charts, listas, empty states e formulários que aparecem nele — pra ficar 100% coerente com a linguagem Apple antes de avançar pra outros módulos (Fase 4).

### Exploração antes de implementar

Preciso ler para mapear exatamente o que renderiza no Dashboard hoje:
- `src/components/Dashboard/Metrics/AdminMetrics.tsx` (já refinado na Fase 1, mas tem charts internos)
- `src/components/Dashboard/Metrics/AdvogadoMetrics.tsx` (idem)
- Outros painéis de role: `ComercialMetrics`, `FinanceiroMetrics`, `AgendaMetrics`, `EstagiarioMetrics`, `PeritoMetrics`, `ControllerMetrics`
- Charts que aparecem dentro deles (recharts wrappers)
- Empty states e loading states

### O que vai mudar

**1. Charts (Recharts) — paleta e estilo Apple**
- Grid: `strokeDasharray="2 4"` mais sutil, cor `border/40`.
- Eixos: tick fontSize 11, cor `muted-foreground`.
- Tooltip: fundo `bg-popover/95` com `backdrop-blur`, `rounded-xl`, `shadow-apple-md`.
- Linhas: `strokeWidth={2.5}`, dots maiores e suaves.
- Barras: `radius={[8, 8, 0, 0]}` mais arredondadas.
- Paleta: usar tokens semânticos (`--chart-1` a `--chart-5`) com cores dessaturadas estilo iOS.

**2. Cards de listas (próximos prazos, atividades recentes, etc.)**
- Items com `rounded-xl`, hover sutil (`bg-muted/40`), divisores mais leves.
- Avatares e badges refinados (pílulas com `bg-primary/10`).

**3. Empty states**
- Ícone grande em container `kpi-icon` (cor temática a 10%).
- Título `text-lg font-medium`, subtítulo `text-muted-foreground`.
- Botão de ação primário se aplicável.

**4. Loading states (skeletons)**
- `rounded-xl`, `bg-muted/60`, animação `animate-pulse` mais suave.
- Esqueletos com forma do conteúdo final (não retângulos genéricos).

**5. Outros painéis de role (replicar Fase 1 nos demais)**
- Aplicar `kpi-card`, `kpi-icon`, `apple-h1`, `apple-subtitle` em:
  - `ComercialMetrics`, `FinanceiroMetrics`, `AgendaMetrics`, `EstagiarioMetrics`, `PeritoMetrics`, `ControllerMetrics`.
- Garantir que **qualquer role** que o usuário tenha veja o mesmo padrão visual.

**6. Token novo — paleta de chart Apple**
Adicionar em `index.css`:
- `--chart-1` a `--chart-5` refinados (tons dessaturados de azul, verde, laranja, roxo, vermelho).

### Arquivos afetados (estimativa)

- `src/index.css` — tokens de chart refinados.
- `src/components/Dashboard/Metrics/ComercialMetrics.tsx`
- `src/components/Dashboard/Metrics/FinanceiroMetrics.tsx`
- `src/components/Dashboard/Metrics/AgendaMetrics.tsx`
- `src/components/Dashboard/Metrics/EstagiarioMetrics.tsx`
- `src/components/Dashboard/Metrics/PeritoMetrics.tsx`
- `src/components/Dashboard/Metrics/ControllerMetrics.tsx`
- Charts internos do Dashboard (Recharts wrappers que vou identificar lendo os Metrics).
- Empty states e skeletons usados nesses painéis.

Vou listar exatamente quais arquivos depois de explorar a pasta `Metrics/` no início da implementação.

### Impacto

- **Usuário final (UX)**:
  - Dashboard fica visualmente **100% coerente** independente do role do usuário (admin, advogado, comercial, financeiro, etc.).
  - Charts ficam mais elegantes e legíveis (paleta dessaturada cansa menos).
  - Empty/loading states deixam de parecer "vazios" e viram parte da experiência polida.
- **Dados**: zero mudanças.
- **Performance**: imperceptível. Recharts já é otimizado.
- **Riscos colaterais**:
  - Mudança na paleta `--chart-X` afeta **qualquer chart** em outros módulos que use esses tokens (ex: relatórios de Controladoria, Financeiro). Isso é **bom** (consistência), mas se algum lugar dependia de cores específicas vou verificar.
  - Charts que usam cores hardcoded (`fill="#22c55e"`) continuam iguais — vou identificar e migrar pros tokens onde fizer sentido.
  - Outros painéis de role podem ter estruturas diferentes do Admin/Advogado — vou adaptar caso a caso, mantendo a lógica intacta.
- **Quem é afetado**: todos os usuários do sistema jurídico ao acessar Dashboard, em qualquer role. Veridicto/Vouti.co/VoTech: não afetados.

### Validação

1. `/solvenza/dashboard` em cada role (admin, advogado, comercial, financeiro, agenda) → confirmar visual consistente.
2. Charts com dados reais → cores legíveis, tooltips elegantes, animações suaves.
3. Empty state (tenant novo sem dados) → ícone bonito, mensagem clara.
4. Loading inicial → skeletons suaves.
5. Dark mode em todas as roles → contraste ok.
6. Viewport 768px e mobile (390px) → responsivo, charts redimensionam.
7. Outros módulos (CRM, Controladoria) → confirmar que tokens de chart não causaram regressão.

### Próximo passo após aprovação

1. Listar `src/components/Dashboard/Metrics/` pra mapear todos os painéis de role e seus charts.
2. Adicionar tokens de chart refinados no `index.css`.
3. Aplicar refinamentos nos painéis de role um por um.
4. Refinar empty/loading states.
5. Validar visualmente e propor **Fase 4** (refinamento por módulo: Planejador, Controladoria, CRM, etc.).

