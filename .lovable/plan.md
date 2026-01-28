# Correção de Comentários no Setor de Acordos

## Status: ✅ CONCLUÍDO

### Alterações Realizadas

1. **Interface Comment atualizada** (`src/types/project.ts`)
   - Campos adicionados: `replyToId`, `replyToText`, `replyToAuthor`

2. **Migração do banco de dados executada**
   - Colunas `reply_to_id`, `reply_to_text`, `reply_to_author` adicionadas em `task_comments`

3. **AcordosView corrigido** (`src/pages/AcordosView.tsx`)
   - `useAuth` hook adicionado para obter usuário atual
   - `currentUser` e `projectId` passados para TaskModal

4. **TaskModal atualizado** (`src/components/Project/TaskModal.tsx`)
   - Estado `replyingTo` para gerenciar respostas
   - Real-time subscription via Supabase postgres_changes
   - Botão "Responder" em cada comentário
   - Preview de citação ao responder
   - Exibição de citação em comentários que são respostas

### Funcionalidades

- ✅ Editar comentários (apenas autor)
- ✅ Apagar comentários (apenas autor)
- ✅ Responder/citar comentários
- ✅ Atualização em tempo real multiusuário
