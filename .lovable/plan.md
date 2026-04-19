

## Alinhar calendário começando na segunda-feira (domingo no fim)

### Causa raiz
O `AgendaCalendar.tsx` usa `startOfWeek`/`endOfWeek` do `date-fns` sem `weekStartsOn`, que defaulta a 0 (domingo). Resultado: a grade começa no domingo e termina no sábado. O usuário quer ordem **Seg, Ter, Qua, Qui, Sex, Sáb, Dom**.

### Correção (`src/components/Agenda/AgendaCalendar.tsx`)

1. Adicionar `{ weekStartsOn: 1 }` em todas as chamadas:
   - `startOfWeek(monthStart, { weekStartsOn: 1 })`
   - `endOfWeek(monthEnd, { weekStartsOn: 1 })`
   - `startOfWeek(currentDate, { weekStartsOn: 1 })` (se houver no header)

2. Ajustar `renderDaysOfWeek` para gerar labels começando na segunda — usar o mesmo `startOfWeek(date, { weekStartsOn: 1 })` como base do loop ao invés do array hardcoded (ou reordenar o array hardcoded para `['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']`).

### Arquivos afetados
- `src/components/Agenda/AgendaCalendar.tsx`

### Impacto
- **UX**: calendário agora exibe semana Seg→Dom, com domingo na última coluna (padrão BR/EU). Funciona nos modos full e compact.
- **Dados**: zero. Apenas renderização.
- **Riscos colaterais**: nenhum. Lógica de seleção/eventos por dia é por data exata, não por índice de coluna.
- **Quem é afetado**: todos os usuários da Agenda (`/:tenant/agenda`) e qualquer lugar que use `AgendaCalendar`.

### Validação
1. `/solvenza/agenda` → cabeçalho mostra: Seg Ter Qua Qui Sex Sáb Dom.
2. Dias do mês alinhados corretamente abaixo dos respectivos rótulos.
3. Modo compact (mobile) idem.

