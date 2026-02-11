

## Kanban: Carregamento em Background + Polling Silencioso de 2s

### Problema atual

1. **Drag-and-drop instavel**: O `loadKanbanData` define `setIsLoading(true)` toda vez que e chamado, causando re-render completo e perda do estado de drag
2. **Sem polling**: Os dados so carregam uma vez -- nao atualizam automaticamente
3. **Kanban desmonta**: Ao trocar de secao no drawer, o componente e destruido e recriado, perdendo todo o estado

### Solucao

**1. Polling silencioso no WhatsAppKanban (a cada 2s)**

No `WhatsAppKanban.tsx`:
- Separar o carregamento inicial (com loading spinner) do refresh silencioso (sem spinner)
- Criar uma funcao `silentRefresh` que faz o mesmo fetch mas **nao** chama `setIsLoading(true)`
- Adicionar `useEffect` com `setInterval` de 2 segundos que chama `silentRefresh`
- O refresh silencioso atualiza `columns` e `cards` sem piscar a tela
- Importante: durante um drag ativo, pular o refresh para nao interferir (usar um `useRef` como flag `isDragging`)

**2. Kanban sempre montado no WhatsAppDrawer**

No `WhatsAppDrawer.tsx`:
- Em vez de renderizar o Kanban condicionalmente dentro do `switch/case`, manter o componente sempre montado com `display: none` quando nao e a secao ativa
- Assim o Kanban carrega em background e mantem o estado entre navegacoes
- As demais secoes continuam com renderizacao condicional normal

### Detalhes tecnicos

**Arquivo: `src/components/WhatsApp/sections/WhatsAppKanban.tsx`**

```typescript
// Ref para evitar refresh durante drag
const isDraggingRef = useRef(false);

// Carregamento inicial (com spinner)
const loadKanbanData = useCallback(async () => {
  setIsLoading(true);
  // ... fetch igual ao atual ...
  setIsLoading(false);
}, [agentId, agentName]);

// Refresh silencioso (sem spinner, sem toast de erro)
const silentRefresh = useCallback(async () => {
  if (!agentId || isDraggingRef.current) return;
  try {
    // mesmo fetch, mas sem setIsLoading
    const [columnsRes, cardsRes, messagesRes, contactsRes] = await Promise.all([...]);
    // atualizar estado normalmente
    setColumns(columnsData);
    setCards(enrichedCards);
  } catch {
    // silencioso - nao mostra toast
  }
}, [agentId, agentName]);

// Polling a cada 2 segundos
useEffect(() => {
  const interval = setInterval(silentRefresh, 2000);
  return () => clearInterval(interval);
}, [silentRefresh]);

// Flag de drag
const handleDragStart = () => { isDraggingRef.current = true; };
const handleDragEnd = async (result: DropResult) => {
  isDraggingRef.current = false;
  // ... logica existente ...
};

// No JSX: <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
```

**Arquivo: `src/components/WhatsApp/WhatsAppDrawer.tsx`**

```typescript
// Kanban fica sempre montado, escondido quando nao ativo
<main className="flex-1 overflow-hidden relative">
  {/* Kanban sempre montado */}
  {selectedKanbanAgent && (
    <div className={activeSection === "kanban" ? "h-full" : "hidden"}>
      <WhatsAppKanban agentId={selectedKanbanAgent.id} agentName={selectedKanbanAgent.name} />
    </div>
  )}
  {/* Demais secoes renderizadas condicionalmente */}
  {activeSection !== "kanban" && renderSection()}
</main>
```

### Resumo dos arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/WhatsApp/sections/WhatsAppKanban.tsx` | Polling silencioso 2s, flag `isDragging` para pausar refresh, `onDragStart` handler |
| `src/components/WhatsApp/WhatsAppDrawer.tsx` | Kanban sempre montado com `hidden` class quando inativo |

