# Redesign — Super-Admin / Clientes

## Causa raiz
O `TenantCard` acumula 10+ botões soltos em duas linhas (Configurar, Acessar, Excluir, Stats, Judit, Credenciais, Push-Docs, Banco IDs, Incompletos, Parados, Boletos, Vouti.CRM). Visualmente poluído, sem hierarquia, difícil de escanear quando há muitos tenants.

## Correção — novo desenho do card

```text
┌────────────────────────────────────────────────────────┐
│ [logo]  Nome do Tenant              [● Ativo] [⋯ menu] │
│         slug · dominio.com          [Plano: Pro]       │
│                                                        │
│  ┌──────────┬──────────┬──────────┬──────────┐         │
│  │ Usuários │ Processos│ Parados  │ Pendênc. │  ← KPIs │
│  │   12     │   840    │   23 ⚠   │   2 💳   │         │
│  └──────────┴──────────┴──────────┴──────────┘         │
│                                                        │
│  [ Abrir tenant ↗ ]   [ Auditoria ▾ ]  [ Config ▾ ]    │
│                                          [Vouti.CRM ◯] │
└────────────────────────────────────────────────────────┘
```

### Estrutura
1. **Header limpo**: logo + nome + slug, switch Ativo discreto no topo direito, e um único kebab `⋯` para ações destrutivas (Excluir) e raras (copiar ID).
2. **Strip de KPIs (4 mini-cards clicáveis)** — substitui vários botões-ícone:
   - **Usuários** → abre `TenantUsersDrawer`
   - **Processos** → abre `TenantStatsDialog`
   - **Parados** (com badge se > 0) → abre `TenantProcessosParadosDialog`
   - **Pendências** (boletos + processos incompletos somados, com badge colorida) → abre um pop-over com 2 atalhos: Boletos / Processos incompletos
3. **Barra de ações** com 3 botões claros:
   - **Abrir tenant** (primário, ícone `ExternalLink`) — substitui o botão ghost atual
   - **Auditoria ▾** (dropdown) → Estatísticas, Processos parados, Processos incompletos, Chamadas Judit, Push-Docs, Banco de IDs
   - **Configurar ▾** (dropdown) → Editar dados, Criar admin extra, Credenciais Judit
4. **Toggle Vouti.CRM** vira um switch rotulado discreto no rodapé (em vez de ícone na fileira), com label `Vouti.CRM`.

### Layout da página `/super-admin` (aba Clientes)
- Cabeçalho com título "Clientes" + contador + busca + filtro de plano + botão "Novo cliente".
- Grid responsivo: 1 col mobile, 2 col tablet, **3 col desktop** (atualmente parecem 2). Cards mais compactos verticalmente graças à reorganização.
- Opção de alternar **Grid ↔ Lista compacta** (densa, 1 linha por tenant) para quem prefere ver muitos de uma vez.

## Arquivos afetados
- `src/components/SuperAdmin/TenantCard.tsx` — reescrita do JSX (lógica de dialogs e handlers preservada).
- `src/pages/SuperAdmin.tsx` (aba Clientes) — adicionar toggle Grid/Lista e ajustar grid para 3 colunas em `xl`.
- Possível novo `TenantCardCompact.tsx` para o modo lista.
- Sem mudanças em dialogs, RPCs, RLS, migrations.

## Impacto
1. **UX**: super-admin lê cada tenant em ~1 segundo. KPIs visíveis sem clicar. Ações agrupadas por intenção (auditar / configurar / acessar). Toggle Vouti.CRM deixa de ser confundido com ícone de ferramenta.
2. **Dados**: nenhum. Apenas reposicionamento visual; todas as queries e dialogs continuam idênticos.
3. **Riscos colaterais**: baixo. Risco é apenas que algum botão raramente usado fique "escondido" em dropdown — mitigado mantendo TODAS as funções acessíveis a no máx. 1 clique extra.
4. **Quem é afetado**: somente o super-admin (você). Tenants e demais perfis não veem essa tela.

## Validação
- Abrir `/super-admin` → ver grid 3 colunas em desktop, card com KPIs e 3 botões.
- Cada KPI abre o dialog correto.
- Dropdowns "Auditoria" e "Configurar" listam todas as 10 ações antigas, sem perder nenhuma.
- Toggle Vouti.CRM continua persistindo em `tenants.settings.whatsapp_enabled`.
- Badge de pendências reflete `pendingPayments + incompleteProcessosCount`.
- Modo lista compacta mostra todos os tenants em rolagem única.
