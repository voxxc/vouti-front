# Redesign — Super-Admin / Clientes (formato lista)

## Causa raiz
Cards com 10+ botões soltos são poluídos e ocupam muito espaço vertical. Em formato de cards é difícil comparar tenants lado a lado (quem tem mais pendências, quem está parado, etc.).

## Correção — abandonar cards e adotar uma tabela densa com linha expansível

### Layout principal: tabela "command-center"

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Clientes  ·  12 ativos / 14 total          [🔍 buscar]  [plano ▾]  [+ Novo]      │
├──┬──────────────────┬────────┬─────┬──────┬────────┬────────┬─────────┬──────────┤
│  │ Cliente          │ Plano  │ Usr │ Proc │ Parados│ Pend.  │ Vouti.  │ Ações    │
├──┼──────────────────┼────────┼─────┼──────┼────────┼────────┼─────────┼──────────┤
│▸ │ ◯ Solvenza       │ Pro    │ 12  │ 840  │  23 ⚠  │  2 💳  │  ●      │ ↗  ⋯     │
│▸ │ ◯ Oliveira Adv   │ Solo   │  4  │ 312  │   0    │  0     │  ○      │ ↗  ⋯     │
│▾ │ ◯ Batink         │ Team   │  9  │ 1.2k │  47 ⚠  │  5 💳  │  ●      │ ↗  ⋯     │
│  │   ┌─────────────────────────────────────────────────────────────────────┐    │
│  │   │ Auditoria   Estatísticas · Parados · Incompletos · Push-Docs · IDs  │    │
│  │   │ Integrações Credenciais Judit · Chamadas Judit · Vouti.CRM toggle   │    │
│  │   │ Acesso      Editar dados · Criar admin · Abrir tenant ↗ · Excluir   │    │
│  │   └─────────────────────────────────────────────────────────────────────┘    │
│▸ │ ◯ ...                                                                        │
└──┴──────────────────────────────────────────────────────────────────────────────┘
```

### Componentes da linha (colapsada)
- **Indicador de status**: bolinha verde/cinza (ativo/inativo) + nome + slug pequeno embaixo.
- **Plano**: badge colorida (`PlanoIndicator`).
- **KPIs numéricos** (clicáveis individualmente): Usuários, Processos, Parados (com cor de alerta se > 0), Pendências (boletos + incompletos).
- **Vouti.CRM**: switch compacto inline.
- **Ações sempre visíveis**: `↗` abrir tenant (novo aba) e `⋯` menu (Editar, Criar admin, Excluir).
- **Click no chevron `▸`** expande uma faixa horizontal com 3 grupos rotulados: **Auditoria**, **Integrações**, **Acesso** — cada um lista as ações como pílulas/botões de texto. Nada de ícones soltos; tudo nomeado.

### Cabeçalho da página
- Título + contagem ativo/total.
- Busca por nome/slug/domínio.
- Filtros: plano, status (ativo/inativo), tem pendência, Vouti.CRM ligado.
- Botões `[+ Novo cliente]` e `[+ Vouti.CRM standalone]`.
- Toggle `Densa ↔ Confortável` (altera padding das linhas).

### Comportamento
- Ordenação por coluna (clique no header): nome, plano, processos, parados, pendências.
- Apenas uma linha expandida por vez (estado local).
- Linha com pendência > 0 ganha leve tint na coluna; linha com parados > N idem.
- Mobile: a tabela vira lista de "ítens-linha" verticais, mas mantém o mesmo princípio (linha colapsada → toque expande).

## Arquivos afetados
- `src/pages/SuperAdmin.tsx` — substituir grid de `TenantCard` por novo componente `TenantsTable`.
- **Novo** `src/components/SuperAdmin/TenantsTable.tsx` — render principal (header, filtros, ordenação, linhas).
- **Novo** `src/components/SuperAdmin/TenantRow.tsx` — linha colapsada + faixa expansível.
- `TenantCard.tsx` — mantido temporariamente como fallback, depois removido.
- Todos os dialogs existentes (`TenantStatsDialog`, `TenantProcessosParadosDialog`, `TenantPushDocsDialog`, `TenantBancoIdsDialog`, `TenantCredenciaisDialog`, `TenantJuditLogsDialog`, `TenantProcessosIncompletosDialog`, `SuperAdminBoletosDialog`, `CreateTenantAdminDialog`, `EditTenantDialog`) — **reaproveitados sem mudanças**.

## Impacto
1. **UX (você, super-admin)**: vê 15-20 tenants na mesma tela sem rolar. Comparações instantâneas (quem tem mais parados, mais pendências). Ações nomeadas em vez de adivinhar ícones. Filtros e ordenação aceleram triagem.
2. **Dados**: zero alteração. Sem migrations, sem RLS, sem RPC nova. Apenas reorganização do front.
3. **Riscos colaterais**: baixo. Risco é familiaridade — você está acostumado com o layout em cards. Mitigado mantendo nomes/ícones consistentes nas pílulas expandidas.
4. **Quem é afetado**: apenas o super-admin (você). Tenants, admins de tenant e demais perfis não acessam essa tela.

## Validação
- `/super-admin` mostra tabela com todos os tenants e contadores corretos.
- Cada KPI (Usuários, Processos, Parados, Pendências) abre o dialog correspondente ao clicar.
- Chevron expande/colapsa linha; todas as 10+ ações antigas estão presentes nas 3 seções (Auditoria / Integrações / Acesso) e funcionam.
- Switch Vouti.CRM persiste em `tenants.settings.whatsapp_enabled`.
- Filtros, busca e ordenação funcionam combinados.
- Densa ↔ Confortável altera padding sem quebrar layout.
- Mobile: linhas viram itens verticais navegáveis.
