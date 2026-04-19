

## Fase 2 — Componentes shadcn globais + Sidebar (Apple-style)

### Causa raiz / Justificativa

Fase 1 estabeleceu tokens e refinou KPIs do Dashboard. Agora vamos refinar os **componentes base do shadcn/ui** que aparecem em **todo o sistema** (botões, inputs, cards, dialogs, dropdowns, sheets) e a **sidebar do DashboardLayout**. Isso eleva a linguagem Apple pra todos os módulos automaticamente, sem precisar tocar em cada um.

### O que vai mudar

**1. Sidebar (`DashboardLayout.tsx`)**
- Fundo translúcido com `glass-surface` (igual topbar).
- Item ativo vira **pílula arredondada** (`rounded-xl`) com fundo `bg-primary/10` e texto `text-primary` — sem barra colorida cheia.
- Item inativo: hover sutil com `bg-muted/50`, transição suave.
- Ícones um pouco maiores (`h-5 w-5`), espaçamento mais generoso.
- Logo/header da sidebar com tipografia refinada.

**2. Button (`src/components/ui/button.tsx`)**
- Altura padrão `h-10` → `h-11` (mais confortável, estilo iOS).
- Cantos: `rounded-md` → `rounded-xl`.
- Variant `default`: sombra sutil + hover com leve elevação.
- Variant `outline`: borda mais fina, hover com `bg-muted/50`.
- Transição com easing Apple (já existe).
- Manter todas as variants e sizes existentes — só refinar visual.

**3. Card (`src/components/ui/card.tsx`)**
- `rounded-lg` → `rounded-2xl`.
- `shadow-sm` → `shadow-apple-sm` (token criado na Fase 1).
- Padding do header: manter `p-6`.

**4. Input / Textarea / Select**
- Altura `h-10` → `h-11`.
- `rounded-md` → `rounded-xl`.
- Focus ring mais elegante (`ring-2 ring-primary/30` em vez de ring forte).
- Borda mais sutil em estado normal.

**5. Dialog / Sheet / Drawer**
- Backdrop com `backdrop-blur-md` (blur leve atrás do modal).
- Conteúdo com `rounded-2xl`, sombra `shadow-apple-lg`.
- Animação de entrada já existe — ajustar duração pra `duration-300` com easing Apple.

**6. DropdownMenu / Popover / ContextMenu**
- `rounded-xl`, sombra refinada.
- Items com hover sutil (`bg-muted/60`), padding ligeiramente maior.

**7. Tooltip**
- `rounded-lg`, fundo `bg-foreground/95` com leve blur, texto crisp.

### Escopo

- **Componentes shadcn afetam o sistema inteiro** — todos os módulos (CRM, Planejador, Controladoria, Agenda, Financeiro, etc.) recebem o refinamento automaticamente.
- **Sidebar refinada** aparece em todas as páginas que usam `DashboardLayout`.
- **Não mexer ainda** em: páginas específicas dos módulos (Fase 4), componentes custom não-shadcn.

### Arquivos afetados

- `src/components/Dashboard/DashboardLayout.tsx` — sidebar com glass + pílulas.
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/tooltip.tsx`

### Impacto

- **Usuário final (UX)**:
  - **Todo o sistema** ganha visual mais premium imediatamente — botões, modais, dropdowns, inputs ficam mais arredondados, com sombras suaves e animações refinadas.
  - Sidebar do dashboard com pílulas estilo macOS Sequoia, fundo translúcido.
  - Sensação de produto coeso e moderno.
- **Dados**: zero mudanças.
- **Performance**: imperceptível. `backdrop-blur` em modais/sidebar tem custo leve em GPU, ok em hardware moderno.
- **Riscos colaterais**:
  - Mudança de altura de botões/inputs (`h-10` → `h-11`) pode quebrar **layouts compactos** que dependiam da altura exata (ex: toolbars densas, tabelas inline). Vou mitigar mantendo o size `sm` (`h-9`) para casos compactos — quem precisa de denso usa `size="sm"`.
  - Cards com `rounded-2xl` em containers muito pequenos podem parecer estranhos — improvável, mas vou checar.
  - Componentes que sobrescrevem classes (ex: `className="rounded-md"`) continuam funcionando — a mudança é no default, sobrescrita prevalece.
- **Quem é afetado**: **todos os usuários de todos os tenants** em **todos os módulos**. Veridicto, Vouti.co landing, VoTech, Vouti Link-in-Bio: **não afetados** (têm seus próprios componentes ou estilos isolados).

### Validação

1. `/solvenza/dashboard` → sidebar com pílulas + glass, botões e cards refinados.
2. Abrir `UserManagementDrawer` (botão "Adicionar Usuário") → sheet com cantos arredondados, backdrop com blur.
3. Navegar pra `/solvenza/crm`, `/solvenza/planejador`, `/solvenza/controladoria` → verificar consistência visual sem quebras.
4. Abrir dropdowns (menus de tenant, perfil) → cantos arredondados, sombras suaves.
5. Testar formulários (criar prazo, criar cliente) → inputs `h-11`, focus ring elegante.
6. Dark mode em todas as telas acima → contraste ok.
7. Viewport mobile (390px) → sidebar/topbar responsivos, sem quebras.

### Próximo passo após aprovação

Aplico as mudanças nos 11 arquivos listados, com cuidado pra preservar variantes e sizes existentes. Depois você valida visualmente e decide se vamos pra **Fase 3** (refinamentos por módulo: dashboard charts, formulários custom, empty states).

