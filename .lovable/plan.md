

## Corrigir Drag-and-Drop do Kanban CRM

### Problemas identificados

O `handleDragEnd` atual tem dois bugs criticos:

1. **Nao reordena os outros cards** - Quando um card e movido para a posicao 2 de uma coluna, apenas o card movido recebe `card_order = 2`. Os outros cards da coluna destino nao sao reordenados, causando conflitos de `card_order`. Na proxima atualizacao do polling (2 segundos), o card pode "pular" para uma posicao errada ou coluna errada porque os dados do banco estao inconsistentes.

2. **Nao atualiza os cards restantes da coluna de origem** - Quando um card sai de uma coluna, os cards que ficam nao tem seus `card_order` ajustados, gerando buracos na ordenacao.

### Solucao

Reescrever o `handleDragEnd` para:

1. Remover o card da lista da coluna de origem
2. Inserir o card na posicao exata na coluna de destino
3. Recalcular `card_order` sequencial (0, 1, 2, 3...) para **todos** os cards das colunas afetadas
4. Atualizar **todos** os cards afetados no banco de dados (nao apenas o card movido)
5. Aplicar a atualizacao otimista com os valores corretos antes de salvar no banco

### Mudancas tecnicas

**Arquivo**: `src/components/WhatsApp/sections/WhatsAppKanban.tsx`

**Funcao `handleDragEnd`** (linhas 232-260) - Reescrita completa:

```text
const handleDragEnd = async (result: DropResult) => {
  setTimeout(() => { isDraggingRef.current = false; }, 3000);
  
  if (!result.destination) return;
  const { source, destination, draggableId } = result;
  
  // Se nao mudou de lugar, ignorar
  if (source.droppableId === destination.droppableId && source.index === destination.index) return;

  const sourceColId = source.droppableId === "no-column" ? null : source.droppableId;
  const destColId = destination.droppableId === "no-column" ? null : destination.droppableId;

  // Criar copia dos cards agrupados por coluna
  const sourceCards = cards
    .filter(c => c.column_id === sourceColId)
    .sort((a, b) => a.card_order - b.card_order);

  const movedCard = sourceCards.find(c => c.id === draggableId);
  if (!movedCard) return;

  // Remover da coluna origem
  sourceCards.splice(source.index, 1);

  // Se mesma coluna, inserir na nova posicao
  // Se coluna diferente, pegar cards da coluna destino
  let destCards: KanbanCard[];
  if (sourceColId === destColId) {
    destCards = sourceCards;
  } else {
    destCards = cards
      .filter(c => c.column_id === destColId)
      .sort((a, b) => a.card_order - b.card_order);
  }

  // Inserir card na posicao exata do destino
  const updatedCard = { ...movedCard, column_id: destColId };
  destCards.splice(destination.index, 0, updatedCard);

  // Recalcular card_order sequencial para ambas as colunas
  const updates: { id: string; column_id: string | null; card_order: number }[] = [];

  // Cards da coluna destino (inclui o card movido)
  destCards.forEach((card, idx) => {
    updates.push({ id: card.id, column_id: destColId, card_order: idx });
  });

  // Cards da coluna origem (se diferente da destino)
  if (sourceColId !== destColId) {
    sourceCards.forEach((card, idx) => {
      updates.push({ id: card.id, column_id: sourceColId, card_order: idx });
    });
  }

  // Aplicar atualizacao otimista
  setCards(prev => {
    const updated = [...prev];
    updates.forEach(upd => {
      const idx = updated.findIndex(c => c.id === upd.id);
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], column_id: upd.column_id, card_order: upd.card_order };
      }
    });
    return updated;
  });

  // Salvar TODOS os cards afetados no banco
  try {
    await Promise.all(
      updates.map(upd =>
        supabase
          .from("whatsapp_conversation_kanban")
          .update({ column_id: upd.column_id, card_order: upd.card_order })
          .eq("id", upd.id)
      )
    );
  } catch (error) {
    console.error("Erro ao atualizar posicoes:", error);
    toast.error("Erro ao mover card");
    loadKanbanData();
  }
};
```

### Resultado esperado

- Card arrastado para coluna X permanece na coluna X (sem pular para coluna aleatoria)
- Card solto entre outros cards permanece na posicao exata onde foi solto
- Todos os cards das colunas afetadas tem `card_order` sequencial no banco
- Polling nao sobrescreve a posicao porque o banco ja esta correto

