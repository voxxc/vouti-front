# Revisão — Alteração de perfil e senha

## Causa raiz

Auditando o fluxo "editar usuário" (UserManagement / Drawer) e a aba "Meu Perfil", encontrei 4 problemas além do bug de email já corrigido:

1. **Auto-troca de senha quebra a sessão igual ao email.** Quando um admin altera a **própria senha** pelo gerenciamento de usuários, o Supabase revoga os refresh tokens da sessão atual. Hoje não tratamos isso — o usuário fica com tela travada / 401 nas próximas chamadas, exatamente como acontecia com o email.
2. **`update-user-email` usa `has_role` global** (sem `tenant_id`). Em ambiente multi-tenant deveria usar `has_role_in_tenant` (igual ao `update-user-password`). Pequena brecha de isolamento.
3. **Aba "Meu Perfil" (`PerfilTab`) não tem alteração de senha.** Hoje o único caminho para um usuário trocar a própria senha é "Esqueci a senha" (fluxo por email). Não existe formulário self-service dentro do app.
4. **Aba "Meu Perfil" não permite trocar email** (campo bloqueado). Mantemos bloqueado por enquanto — decisão consciente para evitar engenharia social. Troca de email continua via admin.

## Correção

### 1. Auto-troca de senha (UserManagement + Drawer)
- Detectar `isSelf && passwordChanged`.
- Após sucesso: `supabase.auth.signOut()` + redirect para `/{slug}/auth` com toast "Senha alterada, faça login com a nova senha."
- Mesma estratégia que já aplicamos para o email.

### 2. `update-user-email` — isolamento por tenant
- Substituir `has_role(user.id, 'admin')` por `has_role_in_tenant(user.id, 'admin', adminProfile.tenant_id)`.
- Carregar `adminProfile.tenant_id` **antes** do check (padrão já usado em `update-user-password`).

### 3. Self-service "Alterar minha senha" em `PerfilTab`
- Nova seção "Segurança" com 3 campos: senha atual, nova, confirmar.
- Nova Edge Function `update-own-password`:
  - Recebe `current_password` + `new_password`.
  - Valida `current_password` via `signInWithPassword` antes de atualizar.
  - Chama `auth.admin.updateUserById` com service role.
  - Mínimo 8 caracteres (alinhado ao Super Admin).
- Após sucesso: `signOut()` + redirect ao `/auth` (a sessão será invalidada de qualquer forma).

### 4. Validações consistentes
- Padronizar mínimo de senha em **8 caracteres** em todos os formulários. Hoje varia entre 6 e 8.

## Arquivos afetados

- `src/components/Admin/UserManagement.tsx` — handler `isEditingSelf && passwordChanged` → logout.
- `src/components/Admin/UserManagementDrawer.tsx` — mesmo handler.
- `src/components/Extras/PerfilTab.tsx` — nova seção "Segurança / Alterar senha".
- `supabase/functions/update-user-email/index.ts` — `has_role_in_tenant`.
- `supabase/functions/update-user-password/index.ts` — bump min 6 → 8.
- `supabase/functions/update-own-password/index.ts` — **novo**.
- `supabase/config.toml` — registrar nova function.

## Impacto

**Para o usuário final (UX):**
- Admin que mudar a própria senha será deslogado com toast "faça login com a nova senha" (igual ao email).
- Qualquer usuário (advogado, financeiro, estagiário...) ganha um formulário "Alterar minha senha" dentro de Meu Perfil, sem depender de admin nem de email de recuperação.
- Senhas precisam ter mínimo 8 caracteres na criação/alteração. Logins existentes com senha menor continuam funcionando.

**Nos dados:**
- Nenhuma migration de tabela. Apenas nova Edge Function.
- Nenhuma mudança em RLS.
- `update-user-email` passa a ter isolamento por tenant correto — fecha pequena brecha.

**Riscos colaterais:**
- Usuário com senha de 6/7 chars precisará escolher uma de 8+ ao trocar. Não bloqueia login com a antiga.
- Logout automático após self-edit pode confundir admin desavisado — mitigado pelo toast explicativo.

**Quem é afetado:**
- Todos os admins de todos os tenants (logout automático ao trocar próprio email/senha).
- Todos os usuários (ganham a aba de troca de senha self-service).
- Super Admin **não** é afetado — já tem fluxo próprio (`SuperAdminOwnPasswordCard`).

## Validação

1. Admin troca senha de outro usuário → permanece logado, alvo precisa relogar.
2. Admin troca a **própria** senha → é deslogado e redirecionado para `/{slug}/auth`.
3. Usuário comum abre Meu Perfil → consegue alterar senha informando atual + nova.
4. Usuário comum tenta senha errada na atual → erro "Senha atual incorreta".
5. Admin do tenant A tenta editar email de usuário do tenant B via Postman → 403.
6. Logs de edge functions sem warnings.
