## Causa raiz
No SPN "Manage Users" (`src/components/Spn/AdminUsersManager.tsx`), o admin pode criar/excluir usuário e trocar role/nível, mas não há campo para alterar **email** e **senha** de um usuário já existente. A edge function `spn-create-user` só suporta `create` e `delete`.

## Correção
1. **Edge function `spn-create-user`**: adicionar nova `action === 'update_credentials'` que recebe `{ user_id, email?, password? }` e chama `supabaseAdmin.auth.admin.updateUserById(user_id, { email, password, email_confirm: true })`. Atualizar também `spn_profiles.full_name`/email se relevante (manter escopo apenas em email+senha por agora). Sem reauth, sem envio de link de confirmação (graças a `email_confirm: true`).
2. **`AdminUsersManager.tsx`**: em cada card de usuário, adicionar um botão "Edit" (ícone) que abre um `Dialog` com:
   - Input "New email" (pré-preenchido com email atual quando disponível).
   - Input "New password" (vazio, opcional, mín. 6 chars, toggle eye/eye-off).
   - Botão "Save" → invoca `spn-create-user` com `action: 'update_credentials'`.
   - Sem campo de confirmar senha, sem prompt de confirmação.
3. Como `spn_profiles` não guarda email, buscar o email atual via `supabase.auth.admin` no backend é overkill — vamos só deixar o input vazio com placeholder "Leave blank to keep current" tanto para email quanto para senha; salva só o que foi preenchido.

## Arquivos afetados
- `supabase/functions/spn-create-user/index.ts`
- `src/components/Spn/AdminUsersManager.tsx`

## Impacto
- **UX**: admin do SPN passa a redefinir email/senha de qualquer aluno/professor direto pelo Manage Users, em um diálogo simples, sem confirmação extra e sem link de verificação por email.
- **Dados**: nenhuma migration. Apenas escritas em `auth.users` via service role.
- **Riscos colaterais**: como `email_confirm: true`, qualquer admin SPN pode setar um email arbitrário sem prova de posse — aceitável porque o papel já é privilegiado (`has_spn_role('admin')`). Não afeta tenants do app principal.
- **Quem é afetado**: somente admins SPN e seus usuários (alunos/professores) dentro do módulo SPN.

## Validação
- Como admin SPN, abrir Manage Users → "Edit" em um aluno → trocar só a senha → fazer login com a nova senha.
- Repetir trocando só o email → confirmar que o aluno consegue logar com o novo email imediatamente, sem precisar clicar em link.
- Trocar email e senha juntos em uma única ação.
- Tentar como usuário não-admin SPN → edge function retorna 400 "Only SPN admins can update users".
