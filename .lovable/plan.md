

## Plano: Adicionar botão "Apagar Usuário" no dialog de edição

### Contexto
A edge function `delete-user` já existe e faz todas as validações necessárias (admin, mesmo tenant, não pode deletar a si mesmo). Ela usa `supabaseAdmin.auth.admin.deleteUser()` que remove apenas o acesso de autenticação. Os dados do usuário nas tabelas do sistema (comentários, projetos, prazos, profiles) permanecem intactos por padrão, pois as foreign keys para `auth.users` usam `ON DELETE CASCADE` apenas nas tabelas de controle (profiles, user_roles), não nas tabelas de conteúdo.

**Importante**: A função `deleteUser` do Supabase Auth remove o usuário da tabela `auth.users`, e o `ON DELETE CASCADE` na tabela `profiles` vai deletar o perfil. Porém, tabelas como `projects`, `deadlines`, `deadline_comentarios`, etc., que referenciam `user_id` diretamente ou via `created_by`, manterão os dados (o campo ficará com o UUID antigo, sem referência ativa, mas os dados permanecem visíveis).

### Mudança

**Arquivo**: `src/components/Admin/UserManagementDrawer.tsx`

1. Importar `Trash2` do lucide-react e `AlertDialog` components
2. Adicionar state `isDeleteConfirmOpen` e `deletingUser`
3. No final do formulário de edição (antes do botão "Salvar"), adicionar um separador e botão vermelho "Apagar Usuário"
4. Adicionar `AlertDialog` de confirmação com aviso de que apenas o acesso será removido
5. No confirm, chamar a edge function `delete-user` existente com o `userId`, fechar dialogs e chamar `onDeleteUser` + refresh

### Fluxo do usuário
1. Clica no lápis de edição do usuário
2. No dialog de edição, vê o botão "Apagar Usuário" em vermelho no final
3. Ao clicar, aparece confirmação: "Tem certeza? O acesso será removido, mas projetos, prazos e comentários serão mantidos."
4. Ao confirmar, chama a edge function existente e atualiza a lista

### Arquivos a editar
- `src/components/Admin/UserManagementDrawer.tsx` — adicionar botão + AlertDialog de confirmação + lógica de delete via edge function

