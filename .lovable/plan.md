# Redesign mobile — Super-Admin / Clientes

## Causa raiz
A tabela densa `TenantsTable` foi desenhada para desktop (7 colunas: chevron, cliente, plano, ativo, pendência, Vouti.CRM, ações). Em 390px ela quebra: colunas espremidas, rolagem horizontal, switches difíceis de tocar, painel expandido fica ilegível.

## Correção — layout mobile dedicado (`<md`)

Detectar breakpoint via classes Tailwind (`md:` para desktop, padrão para mobile). Mesmo componente `TenantsTable`, mas:

- **Desktop (`md+`)**: tabela atual, inalterada.
- **Mobile (`<md`)**: lista vertical de "linhas-cartão" empilháveis, e toolbar reorganizada.

### Toolbar mobile
```text
┌────────────────────────────────────┐
│ 12 ativos / 14 total               │
│ [🔍 Buscar...........] [⚙ filtros] │
└────────────────────────────────────┘
```
- Contador em linha própria.
- Busca ocupa quase 100% da largura.
- Botão `Filtros` abre um `Sheet` (lateral/baixo) com: Plano, Status, Pendência, Densidade.
- O toggle Densa/Confortável fica dentro do Sheet (no mobile é menos relevante).

### Linha-cartão mobile (colapsada)
```text
┌────────────────────────────────────┐
│ ● [logo] Nome do Tenant       [▸]  │
│         slug · dominio.com         │
│  [Plano Pro]  [● Ativo]  [2 pend⚠] │
│  ───────────────────────────────── │
│  [↗ Abrir]  [☁ CRM]  [⋯ Mais]      │
└────────────────────────────────────┘
```
- Cabeçalho com bolinha de status + logo + nome (truncado) + chevron à direita.
- Linha de meta: plano, switch ativo (com label), badge de pendências (se > 0).
- Rodapé com 3 botões de toque grandes (44px): Abrir tenant, Toggle Vouti.CRM, kebab Mais.

### Linha-cartão expandida (mobile)
- Mesma estrutura 3 grupos (Auditoria / Integrações / Acesso), mas:
  - Cada grupo vira coluna vertical com label acima dos pills.
  - Pills ocupam largura total (`w-full` ou `flex-1 basis-[calc(50%-0.25rem)]` para 2 colunas).
  - Espaçamento maior entre grupos.

### Touch targets
- Switches, botões e pills com altura mínima **44px** (`h-11`).
- Áreas de toque sem sobreposição.

### Filtros em Sheet (mobile)
- `Sheet` lateral direito ou bottom, com os mesmos controles do desktop.
- Botão "Aplicar" no rodapé.
- Indicador de "N filtros ativos" no botão da toolbar.

## Arquivos afetados
- `src/components/SuperAdmin/TenantsTable.tsx`
  - Toolbar: separar versão mobile (busca + botão Filtros + Sheet) da versão desktop.
  - Render: `<div className="md:hidden">` lista vertical de `TenantRowMobile`; `<div className="hidden md:block">` tabela atual.
- **Novo** `src/components/SuperAdmin/TenantRowMobile.tsx` — card colapsável com mesma lógica de dialogs do `TenantRow`. Compartilha sub-componentes (`ActionGroup`, `PillButton`).
- `src/components/SuperAdmin/TenantRow.tsx` — exportar `ActionGroup` e `PillButton` para reuso pelo card mobile.

Nenhuma mudança em dialogs, RPCs, RLS ou migrations.

## Impacto
1. **UX mobile**: você consegue auditar tenants a partir do celular com botões tocáveis, filtros acessíveis e leitura clara. Em desktop nada muda.
2. **Dados**: zero alteração. Apenas reorganização visual condicional ao breakpoint.
3. **Riscos colaterais**: baixo. Duplicação de markup mitigada por sub-componentes compartilhados. Risco mínimo de divergência entre as duas variantes (mesmos handlers/dialogs).
4. **Quem é afetado**: apenas o super-admin (você) ao acessar `/super-admin` no celular/tablet pequeno.

## Validação
- Em 390px: lista vertical visível, sem rolagem horizontal.
- Toolbar mobile mostra busca + botão Filtros; Sheet abre com Plano/Status/Pendência/Densidade.
- Cada card colapsado mostra nome, plano, status, pendências.
- Botões "Abrir", "CRM" e "Mais" têm altura ≥ 44px.
- Expansão revela 3 grupos (Auditoria/Integrações/Acesso) com pills de largura confortável.
- Em ≥ 768px: tabela desktop atual permanece idêntica.
- Todos os dialogs (Stats, Parados, Push-Docs, Boletos, etc.) abrem normalmente em ambos os modos.
