

## Mini Calendário nos campos de data (Criação/Edição de Tarefa)

### Problema
Nos dialogs de **criar tarefa** e **editar tarefa** dentro da aba Tarefas do caso, o campo de data usa `<Input type="date">` nativo do browser, que é inconsistente e pouco intuitivo. O modal de "Criar Prazo na Agenda" já usa o mini calendário (Popover + Calendar) corretamente.

### Solução
Substituir os dois `<Input type="date">` por componentes `Popover` + `Calendar` (mesmo padrão já usado no modal de prazo do mesmo arquivo).

### Alterações em `src/components/Controladoria/TarefasTab.tsx`

**1. Dialog de Criar Tarefa (linhas 514-522)**
- Trocar `<Input type="date">` por `Popover` + `PopoverTrigger` (Button) + `PopoverContent` + `Calendar`
- Converter `dataExecucao` (string `YYYY-MM-DD`) para `Date` ao exibir no Calendar, e converter de volta para string ao selecionar
- Usar `parseLocalDate()` para conversão segura

**2. Dialog de Editar Tarefa (linhas 748-756)**
- Mesma substituição: trocar `<Input type="date">` pelo mini calendário
- Converter `editDataExecucao` (string) ↔ `Date` da mesma forma

Ambos seguirão o padrão visual já existente no modal de "Criar Prazo na Agenda" (linha 837+), mantendo consistência visual.

