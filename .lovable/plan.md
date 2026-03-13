

# Mover "Vencidos" para o menu e mostrar vencidos na data selecionada

## Problema

1. **"Vencidos" é uma seção fixa separada** — deveria ser uma aba colapsável no mesmo menu underline que "Próximos" e "Concluídos".
2. **Ao clicar em um dia passado, prazos vencidos daquele dia não aparecem na janela do dia.** A linha 1363 filtra: `getDeadlinesForDate(selectedDate).filter(d => !d.completed && !safeIsPast(d.date))` — exclui prazos vencidos (`safeIsPast`), então eles só aparecem na seção "Vencidos" global.

## Alterações em `AgendaContent.tsx`

### 1. Adicionar "overdue" ao `activeSection`
Mudar o tipo de `"upcoming" | "completed" | null` para `"upcoming" | "completed" | "overdue" | null`.

### 2. Remover a seção fixa "Vencidos" (linhas 1343-1359)
Eliminar o bloco que renderiza vencidos como seção sempre visível.

### 3. Adicionar "Vencidos" ao menu underline (linhas 1388-1422)
Inserir o botão "Vencidos (N)" ao lado de "Próximos" e "Concluídos" no mesmo estilo de texto clicável.

### 4. Adicionar seção expansível de Vencidos
Renderizar a lista de vencidos quando `activeSection === "overdue"`, igual às outras seções.

### 5. Corrigir filtro da data selecionada (linha 1363)
Mudar de:
```ts
getDeadlinesForDate(selectedDate).filter(d => !d.completed && !safeIsPast(d.date))
```
Para:
```ts
getDeadlinesForDate(selectedDate).filter(d => !d.completed)
```
Isso faz com que prazos vencidos daquela data específica apareçam na janela do dia (ex: clicar no dia 11 mostra os vencidos do dia 11).

Para evitar duplicação, os prazos que já aparecem na data selecionada serão excluídos da seção "Vencidos" global:
```ts
const overdue = getOverdueDeadlines().filter(d => !isSameDay(d.date, selectedDate));
```

## Arquivo alterado
- `src/components/Agenda/AgendaContent.tsx`

