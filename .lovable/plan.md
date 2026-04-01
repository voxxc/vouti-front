

## Plano: Corrigir corte de conteúdo nos diálogos de detalhes da Controladoria

### Problema
Os diálogos de detalhes de prazos na Controladoria (abas "Subtarefas" e "Prazos Concluídos") não têm limite de altura nem scroll, fazendo o conteúdo ser cortado quando há muita informação (comentário de conclusão longo + subtarefas).

### Solução
Adicionar `max-h-[85vh] overflow-y-auto` ao `DialogContent` dos dois componentes, igual ao que já foi feito no `DeadlineDetailDialog.tsx`.

### Arquivos a editar

1. **`src/components/Controladoria/CentralSubtarefas.tsx`** (linha 525)
   - `<DialogContent className="max-w-lg">` → `<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">`

2. **`src/components/Controladoria/CentralPrazosConcluidos.tsx`** (linha 477)
   - `<DialogContent className="max-w-lg">` → `<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">`

