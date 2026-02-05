
# Remover Loading e Melhorar Fluidez do Drawer Agenda

## Problema Identificado

O `AgendaContent` atualmente exibe um `Skeleton` durante o carregamento, o que causa:
- Interrupção visual da animação fluida do drawer
- Experiência "travada" ao abrir a agenda
- Inconsistência com outros drawers que renderizam imediatamente

## Conceito Visual

```text
ATUAL (problema):                       PROPOSTO (fluido):
                                        
┌─────────────────────┐                 ┌─────────────────────┐
│ Agenda              │                 │ Agenda              │
├─────────────────────┤                 ├─────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░ │ <- skeleton    │     JANEIRO 2026    │ <- calendario
│ ░░░░░░░░░░░░░░░░░░░ │                 │ D  S  T  Q  Q  S  S │    imediato
│ ░░░░░░░░░░░░░░░░░░░ │                 │ 1  2  3  4  5  6  7 │
│ ░░░░░░░░░░░░░░░░░░░ │                 │ 8  9 10 11 12 13 14 │
└─────────────────────┘                 └─────────────────────┘
        ⬇                                       ⬇
   Espera loading                        Abre fluido, dados
   pra mostrar conteudo                  preenchem depois
```

## Alteracoes

### Arquivo: `src/components/Agenda/AgendaContent.tsx`

Remover a condicao de loading e renderizar o calendario diretamente. Os dados serao preenchidos quando chegarem:

**Antes:**
```tsx
export function AgendaContent() {
  const { deadlines, isLoading, selectedDate, setSelectedDate } = useAgendaData();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AgendaCalendar ... />
    </div>
  );
}
```

**Depois:**
```tsx
export function AgendaContent() {
  const { deadlines, selectedDate, setSelectedDate } = useAgendaData();

  return (
    <div className="space-y-6">
      <AgendaCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        deadlines={deadlines}
      />
    </div>
  );
}
```

**Mudancas:**
- Remove o import do `Skeleton`
- Remove a variavel `isLoading` do destructuring
- Remove o bloco condicional `if (isLoading)` que mostrava skeletons
- O calendario renderiza imediatamente com `deadlines` vazio e atualiza quando os dados chegam

## Resultado Esperado

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Abertura do drawer | Mostra skeleton, depois calendario | Calendario aparece imediato |
| Animacao | Interrompida pelo loading | Fluida da esquerda pra direita |
| Dados | Aparecem apos loading | Preenchem o calendario progressivamente |
| Consistencia | Diferente dos outros drawers | Igual aos demais (Reunioes, Controladoria) |

## Nota Tecnica

O `AgendaCalendar` ja esta preparado para receber um array vazio de `deadlines` - ele simplesmente nao mostra indicadores de prazos ate os dados chegarem. Isso permite uma experiencia mais fluida onde o usuario ve o calendario imediatamente e os dados sao "populados" conforme carregam.
