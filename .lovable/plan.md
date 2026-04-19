

## Adicionar linhas de grade no calendário da Agenda

### Causa raiz
O componente `AgendaCalendar.tsx` renderiza as células dos dias usando `<div>` com `grid grid-cols-7` mas **sem nenhuma borda** entre células ou linhas. Isso faz o calendário parecer "flutuante" / sem divisões visuais — diferente de um calendário tradicional com grid.

### Correção (`src/components/Agenda/AgendaCalendar.tsx`)

**1. Wrapper do grid de células** — envolver `renderCells` em um container com borda externa e divisões internas:
```tsx
<div className="rounded-xl border border-border/60 overflow-hidden">
  {rows}
</div>
```

**2. Cada linha (`row`)** — adicionar `border-b border-border/60` (exceto última):
```tsx
<div className="grid grid-cols-7 border-b border-border/60 last:border-b-0">
```

**3. Cada célula (`day`)** — adicionar `border-r border-border/60` (exceto última coluna). Como cada linha tem 7 colunas, usar `[&>*:not(:last-child)]:border-r` no row OU adicionar via index `i < 6`.

**4. Ajustar `rounded-xl` das células** para `rounded-none` (modo full e compact) já que agora a borda externa cuida do arredondamento. Manter `hover:bg-muted/60` e o highlight de seleção/hoje.

**5. Cabeçalho dos dias da semana** (`renderDaysOfWeek`) — adicionar `border-b border-border/60` para separar do grid, e opcionalmente `border-r` entre dias para alinhar com as colunas abaixo.

### Arquivos afetados
- `src/components/Agenda/AgendaCalendar.tsx` (apenas classes Tailwind)

### Impacto
- **UX**: calendário ganha aparência tradicional de grade, com linhas separando dias e semanas — mais legível e familiar. Funciona tanto no modo full (Agenda) quanto no compact (sidebar/mobile).
- **Dados**: zero. Apenas estilização.
- **Performance**: nenhuma.
- **Riscos colaterais**: nenhum. Lógica de seleção, dots de status e click handlers permanecem intactos.
- **Quem é afetado**: todos os usuários que abrem `/:tenant/agenda` (e qualquer lugar que use `AgendaCalendar`, incluindo a versão mobile compact).

### Validação
1. `/solvenza/agenda` → calendário exibe grade com linhas verticais (entre colunas) e horizontais (entre semanas).
2. Borda externa arredondada visível.
3. Hover e seleção de dia continuam funcionando.
4. Modo compact (mobile) também com grade.
5. Dark mode → linhas usam `border-border/60` (visíveis sem ofuscar).

