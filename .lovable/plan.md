

## Plano: Adicionar menu de edição (3 pontos) nos detalhes de prazo do Protocolo e do Caso

### Problema
Nos diálogos de detalhes de prazo abertos via Protocolo (`ProjectProtocoloContent.tsx`) e via Caso (`PrazosCasoTab.tsx`), só existe o botão de concluir/reabrir. Falta o menu de 3 pontos (editar/excluir) que já existe no `DeadlineDetailDialog.tsx` da Agenda.

### Correção do build error
O build error pendente precisa ser investigado e corrigido primeiro.

### Solução

#### 1. `src/components/Project/ProjectProtocoloContent.tsx`

**Importar**: `MoreVertical` do lucide, `DropdownMenu/DropdownMenuContent/DropdownMenuItem/DropdownMenuTrigger`, `AlertDialogTrigger`, e `EditarPrazoDialog`.

**Adicionar estados**:
- `isEditDialogOpen` / `setIsEditDialogOpen`
- `editingDeadline` (objeto Deadline mapeado para o EditarPrazoDialog)

**Na área de ações do dialog** (linha ~841-851), ao lado do botão Concluir/Reabrir, adicionar o menu de 3 pontos com:
- "Editar" → abre `EditarPrazoDialog` com o prazo selecionado
- "Excluir prazo" → AlertDialog de confirmação + delete do Supabase

**Adicionar `EditarPrazoDialog`** no final do componente, com `onSuccess` que faz refetch dos prazos vinculados e atualiza o selectedDeadline.

**Mapear o prazo** do formato bruto (do Supabase) para o formato `Deadline` que o `EditarPrazoDialog` espera (mesmo padrão usado no `DeadlineDetailDialog.tsx`).

#### 2. `src/components/Controladoria/PrazosCasoTab.tsx`

A abordagem mais simples: em vez de replicar toda a lógica de detalhes, **substituir o dialog inline** por abrir o `DeadlineDetailDialog` standalone (que já tem menu de 3 pontos, editar, excluir, comentários, etc.). Isso reaproveita toda a infraestrutura existente e garante que tudo fique sincronizado.

**Alterações**:
- Importar `DeadlineDetailDialog`
- Adicionar estado `selectedDeadlineId` / `isDetailOpen`
- Tornar cada card de prazo clicável (ou adicionar botão Info)
- Renderizar `<DeadlineDetailDialog>` com `onOpenChange` que faz refetch

#### 3. Correção do build error
Investigar e corrigir o erro de build pendente (provavelmente relacionado às alterações anteriores de deadline_number).

### Arquivos a editar
- `src/components/Project/ProjectProtocoloContent.tsx` — adicionar 3 pontos (editar/excluir) no dialog de detalhes
- `src/components/Controladoria/PrazosCasoTab.tsx` — usar `DeadlineDetailDialog` para consistência
- Verificar e corrigir build error

