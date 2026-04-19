

## Fase 4 — Refinamento por módulo (Apple-style)

### Causa raiz / Justificativa

Fases 1–3 cobriram tokens, KPIs do Dashboard, componentes shadcn globais e o interior do Dashboard (charts, painéis de role). Como Fase 2 refinou os componentes base, **muito do sistema já herdou a linguagem Apple automaticamente** (botões, cards, modais, inputs, dropdowns).

A **Fase 4** trata dos módulos que têm **layouts custom e componentes próprios** que não foram tocados pelos refinamentos globais. Cada módulo grande vira uma sub-fase pra evitar mudanças massivas em uma só etapa.

### Sub-fases propostas

**Fase 4.1 — Planejador (Kanban + Chat)**
- Header da página com `apple-h1` / `apple-subtitle`.
- Colunas do Kanban: `rounded-2xl`, fundo `bg-muted/30`, headers limpos.
- Cards de tarefa: `rounded-xl`, sombra sutil, hover com leve elevação.
- Chat lateral: bolhas de mensagem refinadas, input com glass.
- Filtros e toolbar mais arejados.

**Fase 4.2 — Controladoria (Central + OABs + Push-Doc)**
- KPIs do topo migrados pra `kpi-card` + `kpi-icon` (já tem 5 cards).
- Tabs custom (`Central / OABs / Push-Doc`) refinadas — pílulas estilo iOS segmented control.
- Listas de processos: rows com `apple-list-item`, hover sutil.
- Empty states com `apple-empty`.

**Fase 4.3 — CRM (Inbox + Conversas + Tickets)**
- Sidebar de conversas: items com pílulas `rounded-xl`, ativo com `bg-primary/10`.
- Bolhas de mensagem: cantos mais arredondados (`rounded-2xl`), refinamento de cores recebida/enviada.
- Header da conversa com glass.
- Tabs de tickets (Abertas/Fila/Geral/etc.) com segmented control.
- Drawer de detalhes do contato com refinamentos.

**Fase 4.4 — Agenda (Calendário + Eventos)**
- Cabeçalho do calendário com tipografia refinada.
- Células de dia com `rounded-xl`, hover suave.
- Eventos como pílulas coloridas estilo iOS Calendar.
- Modal de evento com glass + rounded-2xl (já herda da Fase 2, validar).

**Fase 4.5 — Financeiro (Drawer + Lista de clientes)**
- Já tem charts refinados (Fase 3).
- Refinar `FinancialDrawer`: header com glass, lista de clientes com `apple-list-item`.
- Detalhe do cliente: cards de métricas estilo `kpi-card`, badges de status como pílulas.

**Fase 4.6 — Polimento final**
- WhatsApp Bot Workflow Canvas (nodes do React Flow): bordas mais sutis, paleta consistente.
- Telas de auth (login/signup do Solvenza/CRM): tipografia, espaçamento.
- Páginas de configurações (Settings, Profile).

### Recomendação de ordem

Sugiro: **4.2 (Controladoria)** → **4.5 (Financeiro)** → **4.4 (Agenda)** → **4.1 (Planejador)** → **4.3 (CRM)** → **4.6 (Polimento)**.

Razão: começar pelos módulos com **estrutura mais simples** (Controladoria, Financeiro) pra validar padrões antes de atacar os complexos (CRM, Planejador). CRM tem muito state real-time e merece atenção dedicada por último.

### Escopo desta etapa

Aprovação do **roadmap da Fase 4**. Quando aprovar, pergunto qual sub-fase começar (ou seguimos a ordem recomendada).

### Impacto geral da Fase 4

- **UX**: sistema inteiro vira coeso visualmente, sem ilhas com aparência antiga.
- **Dados/Performance**: zero mudanças.
- **Riscos**: cada sub-fase tem riscos isolados (vou detalhar no plano específico de cada uma). Como são módulos independentes, falha numa não afeta outras.
- **Quem é afetado**: usuários do sistema jurídico em todos os tenants. Veridicto/Vouti.co/VoTech: não afetados.

### Validação

A cada sub-fase concluída: validar visualmente o módulo + verificar que outros módulos não regrediram.

### Próximo passo

Confirma se topa o roadmap e por qual sub-fase começamos. Default: **4.2 — Controladoria**.

