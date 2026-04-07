

## Plano: Corrigir exibição do comentário de conclusão na Agenda

### Problema
Ao concluir um prazo, o estado local é atualizado de forma incompleta — apenas `completed: true` é setado, mas `comentarioConclusao`, `concluidoEm`, `completedByName` e `completedByAvatar` ficam vazios. Quando o usuário abre o detalhe do prazo (aba Conclusão), vê "Nenhum comentário de conclusão registrado" mesmo tendo acabado de preencher o campo.

### Causa raiz
Dois locais fazem `setDeadline`/`setDeadlines` após concluir, mas não propagam os campos de conclusão:
1. **AgendaContent.tsx** (linha 830): `{ ...d, completed: true, completedByUserId: user?.id }`  
2. **DeadlineDetailDialog.tsx** (linha 283): `{ ...deadline, completed: true }`

### Correção

**Arquivo 1**: `src/components/Agenda/AgendaContent.tsx` (~linha 830-834)
- Atualizar o `setDeadlines` para incluir todos os campos de conclusão:
  - `comentarioConclusao: comentarioConclusao.trim()`
  - `concluidoEm: new Date()`
  - `completedByUserId: user?.id`
  - `completedByName: user?.user_metadata?.full_name || user?.email`
  - `completedByAvatar: user?.user_metadata?.avatar_url`
- Também atualizar `selectedDeadline` se estiver aberto (para refletir imediatamente na aba Conclusão)

**Arquivo 2**: `src/components/Agenda/DeadlineDetailDialog.tsx` (~linha 283)
- Atualizar o `setDeadline` para incluir os mesmos campos:
  - `comentarioConclusao: comentarioConclusao.trim()`
  - `concluidoEm: new Date()`
  - `completedByUserId: user?.id`
  - `completedByName` e `completedByAvatar` (do perfil do usuário logado)

### Arquivos a editar
- `src/components/Agenda/AgendaContent.tsx`
- `src/components/Agenda/DeadlineDetailDialog.tsx`

