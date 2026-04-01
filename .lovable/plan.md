

## Plano: Tornar diálogos de detalhes de prazos responsivos (sem corte de conteúdo)

### Problema
Os diálogos de detalhes de prazos (informações, conclusão, comentários, subtarefas) não se adaptam à tela — quando há muito conteúdo, ele é cortado porque o `DialogContent` não tem `max-height` nem scroll.

### Solução

Adicionar `max-h-[85vh] overflow-y-auto` ao `DialogContent` dos detalhes de prazo em **dois arquivos**, garantindo que o conteúdo role dentro do dialog sem ultrapassar a viewport.

### Arquivos a editar

1. **`src/components/Agenda/DeadlineDetailDialog.tsx`** (linha 330)
   - Mudar `<DialogContent className="max-w-lg">` para `<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">`

2. **`src/components/Agenda/AgendaContent.tsx`** (buscar o `DialogContent` do detalhe de prazo, ~linha 1530)
   - Adicionar `max-h-[85vh] overflow-y-auto` ao `DialogContent` equivalente

3. **`src/components/Agenda/DeadlineComentarios.tsx`** - verificar se a lista de comentários também precisa de scroll interno (se já usa ScrollArea, manter; senão, adicionar limite de altura)

Resultado: todo o conteúdo (subtarefas, comentários de conclusão, informações detalhadas) ficará acessível via scroll, sem cortar nenhuma informação, adaptando-se a qualquer tamanho de tela.

