## Causa raiz
O `AdminUsersManager` lista usuários a partir de `spn_profiles`, que não armazena `email`. O e-mail vive em `auth.users` e não pode ser lido pelo client. Hoje o card mostra apenas nome + `user_id`, sem o e-mail de login.

## Correção
1. **Edge function `spn-create-user`**: adicionar nova ação `list_emails` que, com a service role, busca `auth.admin.listUsers()` (paginado) e devolve um mapa `{ user_id: email }`. Permanece restrita a admins SPN.
2. **`AdminUsersManager.tsx`**:
   - Após `loadData`, invocar `spn-create-user` com `action: 'list_emails'` e mesclar o e-mail em cada usuário.
   - No card de cada usuário, substituir a linha do `user_id` por uma linha mostrando o e-mail (com `truncate` e ícone de envelope). Manter o `user_id` apenas como `title` (tooltip) para não poluir.
   - Pré-preencher o campo "New email" do diálogo de edição com o e-mail atual.

## Arquivos afetados
- `supabase/functions/spn-create-user/index.ts`
- `src/components/Spn/AdminUsersManager.tsx`

## Impacto
1. **Usuário final (admin SPN)**: passa a ver o e-mail de login de cada aluno/professor diretamente no card, facilitando suporte e troca de credenciais. Sem mudança para alunos.
2. **Dados**: nenhuma migration; leitura via service role apenas dentro da edge function (e-mails nunca expostos a não-admins).
3. **Riscos**: `listUsers` é paginado (default 50); implementar loop até esgotar para tenants com muitos usuários. Latência extra pequena no carregamento da tela.
4. **Quem é afetado**: apenas admins SPN (rota `/spn` → Manage Users).

## Validação
- Abrir Manage Users como admin SPN: confirmar que cada card mostra o e-mail correto.
- Editar um usuário: campo "New email" vem preenchido com o atual; salvar mudança e ver o card refletindo o novo e-mail.
- Como não-admin: chamada `list_emails` deve retornar erro (mantém restrição existente).