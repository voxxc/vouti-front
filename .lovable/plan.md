
## Problems to Fix

### 1. Drawers sobrepõem o menu inferior no mobile
**Root cause**: A variante `inset` no `sheet.tsx` usa `bottom-0`, fazendo o drawer cobrir toda a tela, incluindo o `MobileBottomNav` fixo (`z-50`). Precisa adicionar `bottom-[56px] md:bottom-0` para que o drawer pare antes do menu inferior no mobile.

### 2. Botão X para fechar não está visível na Agenda
**Root cause**: O `SheetPrimitive.Close` fica em `right-4 top-4` (posição absoluta). No `AgendaDrawer`, o header sticky em `top-0 z-10` cobre o X nativo do SheetContent. Solução: adicionar um botão X explícito **dentro** do header do `AgendaDrawer`, e opcionalmente ocultar o X nativo com `[&>button]:hidden` na className do SheetContent.

### 3. Calendário visual recolhível no mobile
**Solução**: Adicionar um toggle button no topo da listagem da `AgendaContent` (mobile only, `md:hidden`) que expande/recolhe o calendário. O calendário no mobile usa uma versão mais compacta do `AgendaCalendar` com células menores (sem os nomes de usuários, apenas dots coloridos). Estado: `showCalendar` (padrão: `false` = recolhido).

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/ui/sheet.tsx` | Variante `inset`: adicionar `bottom-[56px] md:bottom-0` para não cobrir o bottom nav; `left-offset` e `right-offset` também recebem `bottom-[56px] md:bottom-0` |
| `src/components/Agenda/AgendaDrawer.tsx` | Adicionar botão X explícito no header; passar `[&>button]:hidden` ao SheetContent para esconder X duplo |
| `src/components/Agenda/AgendaContent.tsx` | Adicionar estado `showCalendar` + toggle button mobile; mostrar `AgendaCalendar` condicionalmente; versão compacta no mobile |
| `src/components/Agenda/AgendaCalendar.tsx` | Adicionar prop `compact?: boolean` — quando ativo, células menores (`min-h-[44px]`) sem nomes de usuários, apenas dots coloridos |

## Detalhes de implementação

### sheet.tsx — inset variant
```
inset: "top-0 md:top-[57px] md:left-[224px] left-0 right-0 bottom-[56px] md:bottom-0 w-auto h-auto border-l ..."
```
(56px = altura do MobileBottomNav: `h-14` = 56px)

### AgendaDrawer.tsx
```tsx
<SheetContent side="inset" className="p-0 flex flex-col overflow-y-auto [&>button:last-child]:hidden">
  <SheetTitle className="sr-only">Agenda</SheetTitle>
  <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-background sticky top-0 z-10">
    <div className="flex items-center gap-2">
      <Calendar className="h-5 w-5 text-primary" />
      <span className="font-semibold text-lg">Agenda</span>
    </div>
    <SheetClose asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <X className="h-4 w-4" />
      </Button>
    </SheetClose>
  </div>
  <div className="p-3 md:p-6 flex-1 overflow-y-auto">
    <AgendaContent />
  </div>
</SheetContent>
```

### AgendaCalendar.tsx — compact mode
- `compact={true}`: `min-h-[44px]` em vez de `min-h-[100px]`, sem nomes de usuários, apenas dots colorizados abaixo do número do dia, texto menor
- `compact={false}`: comportamento atual (só no desktop)

### AgendaContent.tsx — toggle de calendário mobile
```tsx
const [showCalendar, setShowCalendar] = useState(false);

// No topo da lista, antes dos filtros:
<button className="md:hidden flex items-center gap-2 text-sm text-primary font-medium py-2" 
        onClick={() => setShowCalendar(v => !v)}>
  <CalendarIcon className="h-4 w-4" />
  {showCalendar ? 'Esconder calendário' : 'Ver calendário'}
  <ChevronDown className={cn("h-4 w-4 transition-transform", showCalendar && "rotate-180")} />
</button>

{/* Mobile calendar accordion */}
{showCalendar && (
  <div className="md:hidden border rounded-lg p-3 bg-card mb-3">
    <AgendaCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} deadlines={filteredDeadlines} compact />
  </div>
)}
```
