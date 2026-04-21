

## VoTech — Landing `/votech` + redesign iOS/Apple no app (mobile)

### O que será feito

**(1) Nova landing pública em `/votech`** — substitui o atual `Navigate to="/votech/auth"`. Página de venda focada em **finanças pessoais e para casais**, com estética Apple (whitespace, tipografia grande SF-like, gradientes suaves, vidro fosco, cantos arredondados generosos).

**(2) Redesign do `/votech/auth`** — alinhar à nova identidade Apple (sair do roxo gritante, ir para tons grafite/branco com acento verde-menta financeiro).

**(3) Redesign do dashboard mobile (`/votech/dashboard`)** — nova paleta, novos cards iOS, sidebar virando tab bar inferior no mobile, cartões de saldo grandes estilo Apple Wallet.

---

### Nova identidade visual (substitui o roxo)

**Paleta "VoTech Finance" (estilo iOS 17 / Apple Cash):**
- Background light: `#F5F5F7` (cinza Apple) / dark: `#000000` puro com superfícies `#1C1C1E` e `#2C2C2E`
- Acento principal: **verde-menta `#30D158`** (iOS systemGreen) — substitui o indigo/roxo
- Acento secundário: **azul iOS `#0A84FF`** para ações/links
- Receita: `#30D158` · Despesa: `#FF453A` · Pendente: `#FF9F0A` · Investimento: `#5E5CE6` (usado com parcimônia)
- Tipografia: stack `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif` — pesos 400/600/700, tracking apertado em headings (`tracking-tight`).
- Raios: `rounded-2xl` (16px) e `rounded-3xl` (24px) nos cards principais.
- Sombras suaves (`shadow-[0_4px_24px_rgba(0,0,0,0.06)]` no light, glow sutil no dark).
- Vidro fosco (`backdrop-blur-2xl` + `bg-white/70` ou `bg-black/40`) em headers e tab bar.

---

### (1) Landing `/votech` — `src/pages/VotechLanding.tsx` (novo)

**Posicionamento:** "Seu dinheiro, organizado com a calma de um Sábado." App de finanças pessoais e para casais — sincronize gastos com seu parceiro(a), categorize, e veja para onde seu mês está indo, em segundos.

**Seções (scroll vertical, mobile-first):**

1. **Hero fullscreen**
   - Fundo `#F5F5F7` (light) com mockup grande de iPhone flutuando (CSS, sem imagem externa) mostrando o app.
   - Headline gigante (`text-5xl md:text-7xl font-semibold tracking-tight`): "Suas finanças. Em paz."
   - Sub: "VoTech organiza receitas, despesas e contas — sozinho ou com quem você ama."
   - Dois CTAs pílula: **"Começar grátis"** (preto sólido) e **"Já tenho conta"** (outline) → `/votech/auth`.
   - Pequeno selo: "Disponível agora · Web · iOS em breve".

2. **"Para você. Para vocês."** — duas colunas estilo Apple AirPods Pro page:
   - Coluna 1 — "Solo": ícone de pessoa, mockup do dashboard pessoal.
   - Coluna 2 — "Casal/Família": ícone de duas pessoas, mockup com avatares lado a lado, label "Compartilhado". (Feature de casal posicionada como roadmap próximo se ainda não existir; ver "Impacto" abaixo.)

3. **3 features com hero text gigante** (estilo página de produto Apple, uma por bloco com bastante respiro):
   - **"Veja para onde foi cada real."** — categorização automática + gráfico mensal.
   - **"Nunca mais esqueça uma conta."** — contas a pagar/receber com lembrete e status.
   - **"Relatórios que você entende."** — visual limpo, sem planilha.

4. **Mockup interativo** — composição CSS do dashboard mobile (preview do que vem depois) + tab bar iOS.

5. **Privacidade & dados** — bloco curto: "Seus dados são seus. Criptografia em trânsito e em repouso. Você pode exportar ou apagar tudo a qualquer momento."

6. **FAQ** (5 perguntas: é grátis?, dá pra usar com meu parceiro?, importa do banco?, funciona offline?, meus dados estão seguros?).

7. **CTA final** + footer com links para outros produtos Vouti (`/`, `/crm`, `/veridicto`, `/vouti.co`).

**Stack visual:** Tailwind + tokens já existentes; novas classes inline para a paleta Apple; componentes shadcn (`Button`, `Accordion`); ícones lucide (`Wallet`, `Users`, `PieChart`, `Bell`, `Shield`, `Sparkles`); animações `animate-fade-in`, `animate-scale-in`, e `IntersectionObserver` para revelar blocos no scroll.

**Sem formulário de captação** nesta landing — o CTA leva direto para `/votech/auth` (cadastro). Se o usuário pedir lead capture depois, adicionamos via `landing_leads`.

---

### (2) Redesign `/votech/auth` — edita `src/pages/VotechAuth.tsx`

- Remove fundo `from-slate-950 via-indigo-950` e os cards flutuantes roxos/rosas.
- Novo fundo: `#F5F5F7` (light) / `#000` (dark) com **mesh gradient verde-menta sutil** no topo.
- Card central minimalista: branco puro, `rounded-3xl`, sombra suave, sem borda; logo "Vo·tech" com ponto verde (substitui o `<span class="text-indigo-400">`).
- Tabs estilo iOS segmented control (pílula cinza com slider branco).
- Inputs estilo iOS: cinza claro `#E5E5EA`, sem borda, `rounded-xl`, foco com anel verde `#30D158/30`.
- Botão primário: preto sólido `rounded-full`, texto branco — ou verde menta para "Criar conta".
- Suporte automático a tema claro/escuro via `useLocalTheme`.

---

### (3) Redesign do dashboard mobile (`/votech/dashboard`)

**Arquivos editados:**
- `src/pages/VotechDashboard.tsx` — detectar mobile e trocar layout: sidebar lateral vira **tab bar inferior fixa** (estilo iOS) com 5 itens (Resumo, Receitas, Despesas, Contas, Mais).
- `src/components/Votech/VotechSidebar.tsx` — adicionar variante `mobile` ou criar novo `VotechMobileTabBar.tsx`.
- `src/components/Votech/VotechDashboardView.tsx` — novo cartão "Saldo" estilo Apple Wallet: card grande gradiente preto→grafite com número gigante (`text-5xl font-bold tabular-nums`), nome do usuário no topo, mini chips de receita/despesa do mês embaixo. Cards secundários em grid 2x2 com vidro fosco.
- `src/components/Votech/VotechTransacoesView.tsx` e `VotechContasView.tsx` — no mobile, trocar `<Table>` por **lista vertical** estilo iOS Settings (linhas com ícone circular colorido à esquerda, descrição + data, valor à direita; separadores `border-b border-black/5`). Botão "+" flutuante (FAB) circular preto no canto inferior direito acima da tab bar.
- `src/components/Votech/VotechRelatoriosView.tsx` — paleta nova nos gráficos (verde menta, vermelho coral, sem indigo/purple).

**Tab bar inferior (mobile):**
```text
┌─────────────────────────────────┐
│  📊      💰      💸      📄  ⋯  │
│ Resumo  Recebe  Despesa Contas+ │
└─────────────────────────────────┘
```
- Fixa (`fixed bottom-0`), `backdrop-blur-2xl`, altura 64px + safe-area, ícones lucide, label 10px, item ativo em verde menta.

**Header mobile:** vidro fosco fixo no topo com saudação "Olá, Felipe" + avatar circular à direita (ações no menu).

---

### Arquivos afetados

**Criados:**
- `src/pages/VotechLanding.tsx`
- `src/components/Votech/VotechMobileTabBar.tsx`
- `src/styles/votech-apple.css` (opcional — variáveis CSS da paleta Apple, importado em `App.tsx`)

**Modificados:**
- `src/App.tsx` — trocar `<Route path="/votech" element={<Navigate to="/votech/auth" replace />} />` por `<Route path="/votech" element={<VotechLanding />} />`. Manter `/votech/auth` e `/votech/dashboard` como estão.
- `src/pages/VotechAuth.tsx` — redesign completo.
- `src/pages/VotechDashboard.tsx` — adicionar tab bar mobile, remover sidebar no mobile.
- `src/components/Votech/VotechSidebar.tsx` — manter desktop, esconder no mobile (`hidden md:flex`).
- `src/components/Votech/VotechDashboardView.tsx` — novo card de saldo Apple Wallet, paleta nova.
- `src/components/Votech/VotechTransacoesView.tsx` — lista iOS no mobile + FAB.
- `src/components/Votech/VotechContasView.tsx` — lista iOS no mobile + FAB.
- `src/components/Votech/VotechRelatoriosView.tsx` — cores atualizadas.

**Sem mudanças:** banco, RLS, hooks (`useVotechTransacoes`, `useVotechContas`), tipos, Edge Functions.

---

### Impacto

**Usuário final (UX):**
- Visitantes em `vouti.co/votech` passam a ver uma landing de produto profissional (estilo Apple), não um redirect para login.
- App inteiro (auth + dashboard) deixa o roxo gritante para trás e ganha estética calma, profissional, com hierarquia clara — sensação iOS nativa no mobile.
- Mobile: navegação com tab bar inferior (mais ergonômico que sidebar lateral em telas <768px), listas verticais cabem mais info por tela, FAB para criar transação rapidamente.
- Card de saldo grande comunica de imediato a saúde financeira.

**Dados:**
- Nenhuma migration. A landing fala em "casal/família compartilhado" como diferencial futuro próximo — funcionalidade real de compartilhamento entre cônjuges **não existe ainda no schema** (`votech_profiles` é por `user_id`). A landing apresenta como roadmap ("Em breve"), sem prometer que já funciona. Se quiser implementar de verdade depois, é um plano separado (tabela `votech_couples` ou conceito de "household").

**Riscos colaterais:**
- Quem tinha bookmark de `/votech` que ia direto pro auth agora vê a landing — comportamento desejado.
- Sidebar desktop continua igual, então usuários web não perdem fluxo.
- Mudança de paleta é estética; nenhuma lógica de negócio é tocada.

**Quem é afetado:** visitantes externos, novos usuários e usuários atuais do VoTech (todos veem o redesign no próximo login).

---

### Validação

1. Acessar `/votech` → landing renderiza com hero "Suas finanças. Em paz." em vez de redirect.
2. CTA "Começar grátis" → leva a `/votech/auth`.
3. `/votech/auth` → tela limpa cinza/branca, sem cards flutuantes roxos, sem `bg-slate-950 via-indigo-950`. Login/signup funcionam (mesmo backend).
4. Após login → dashboard com card de saldo grande estilo Wallet, paleta verde-menta, sem indigo-600.
5. Mobile (390x844): sidebar não aparece; tab bar fixa no rodapé com 5 itens; FAB flutuante para criar transação; listas no estilo iOS Settings.
6. Desktop (1440px): sidebar mantida, mas com paleta nova (verde-menta no item ativo em vez de indigo).
7. Tema claro: fundo `#F5F5F7`, cards brancos. Tema escuro: fundo `#000`, superfícies `#1C1C1E`.
8. Buscar "indigo" e "purple" nos arquivos VoTech tocados → nenhuma ocorrência remanescente nas superfícies/acentos principais.
9. Hover/foco com transições suaves (300ms ease), sem jank.
10. Texto "Em breve" claramente marcado no card de "Casal/Família" se a feature ainda for roadmap.

