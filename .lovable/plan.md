

## Fase 4.6 — Polimento Final (Bot Workflow + Auth + Settings)

### Causa raiz / Justificativa

Última sub-fase do roadmap. Restam três áreas com visual ainda pré-Apple:
1. **Bot Workflow Canvas** — editor visual de automações WhatsApp (React Flow).
2. **Auth pages** — telas de login/signup do sistema jurídico, CRM standalone e Veridicto.
3. **Settings** — configurações gerais do sistema (perfil, integrações, equipe, etc.).

### Exploração necessária

Vou ler antes de aplicar:
- `src/components/WhatsApp/settings/bot/` — WorkflowCanvas, NodePalette, nodes individuais (TriggerNode, SendMessageNode, etc.)
- `src/pages/Auth.tsx`, `src/pages/CrmAuth.tsx` (e variantes Veridicto se houver)
- `src/components/Settings/` ou `src/pages/Settings.tsx` — estrutura de abas e formulários

### O que vai mudar

**1. Bot Workflow Canvas**
- Background do canvas: dots mais sutis (`color="#2a2a3e"` com opacidade reduzida).
- **Nodes** (9 tipos): container `rounded-2xl`, `border-border/60`, sombra `shadow-md`, header com cor tintada da categoria + ícone em container `rounded-xl bg-{color}/15`.
- Handles (pontos de conexão) refinados: `rounded-full`, ring sutil.
- Edges (conexões) já com `stroke-primary` — manter.
- **NodePalette**: já está OK (Fase 2 herdada), refinar items para `rounded-xl` consistente, container com `glass-surface`.
- **Controls e MiniMap** do React Flow: aplicar tema claro/escuro consistente, `rounded-xl`.
- Botão "Salvar" no canto: já refinado.

**2. Auth pages (Login/Signup)**
- Card central com `rounded-2xl`, `glass-surface` ou `bg-card border-border/60 shadow-xl`.
- Logo/título com tipografia `apple-h1` + `apple-subtitle`.
- Inputs `rounded-xl` (já herda Fase 2).
- Botão primário grande com `rounded-xl`, `font-semibold`.
- Tabs Login/Signup como `apple-segmented`.
- Background: gradiente sutil ou padrão de pontos discreto.
- Footer com links em `text-muted-foreground hover:text-foreground`.

**3. Settings**
- Header com `apple-h1`/`apple-subtitle`.
- Sidebar de abas com `apple-list-item` (rounded-xl, hover suave, ativo em `bg-primary/10`).
- Cards de seção com `rounded-2xl border-border/60`.
- Toggles, selects e inputs já refinados — validar.
- Empty states com `apple-empty`.

### Arquivos afetados (estimativa)

- `src/components/WhatsApp/settings/bot/WorkflowCanvas.tsx`
- `src/components/WhatsApp/settings/bot/WorkflowNodePalette.tsx`
- `src/components/WhatsApp/settings/bot/nodes/*.tsx` (9 arquivos)
- `src/pages/Auth.tsx`, `src/pages/CrmAuth.tsx` (+ variantes)
- `src/components/Settings/*` ou `src/pages/Settings.tsx`

### Impacto

- **UX**: trinca final fica coesa com todo o ecossistema. Bot canvas com aparência de Linear/n8n moderno. Auth com primeira impressão Apple-grade. Settings consistente com Dashboard/Financeiro.
- **Dados**: zero mudanças. Lógica do canvas (memory `bot-workflow-canvas-architecture`), auth (memories `crm-standalone-auth-navigation-details`, `access-control-gate`) e settings — tudo intacto.
- **Performance**: imperceptível.
- **Riscos colaterais**:
  - React Flow tem CSS próprio (`@xyflow/react/dist/style.css`) — vou usar overrides via classes Tailwind sem quebrar internals.
  - Auth tem múltiplas variantes (jurídico/CRM/Veridicto) — Veridicto tem identidade visual distinta (memory `veridicto-system-type`), **não vou tocar**.
  - Settings pode ter sub-rotas — vou listar antes de aplicar.
- **Quem é afetado**: admins (bot + settings), todos os usuários (auth do sistema jurídico + CRM standalone). Veridicto e VoTech preservam suas identidades próprias.

### Validação

1. `/solvenza/crm` → Settings → Bot → editor visual refinado.
2. `/solvenza/auth` e `crm.vouti.co/solvenza/auth` → cards refinados.
3. `/solvenza/settings` (ou equivalente) → sidebar e cards consistentes.
4. Veridicto (`/veridicto`) e VoTech (`/votech`) → zero alteração visual.
5. Dark mode + viewport 390px → tudo legível.
6. Outros módulos refinados (Dashboard, Agenda, Financeiro, Planejador, CRM) → zero regressão.

### Próximo passo após aprovação

1. Listar diretórios `bot/nodes/`, identificar Auth e Settings reais.
2. Aplicar refinamentos: Bot nodes → Canvas → Auth → Settings.
3. Validar visual. **Encerra a Fase 4** completa.

