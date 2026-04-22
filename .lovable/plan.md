

## Reforço de isolamento de login + nova aba "Usuários" no Super Admin

Três frentes em uma só entrega:

1. **Bloqueio de login com tenant errado** (`/tenantX` aceitando credenciais de `/tenantY`).
2. **Mensagens claras quando o email já existe em outro tenant** (limite do Supabase Auth — não é nosso bug, é arquitetura do provedor).
3. **Aba "Usuários" no Super Admin** com gestão completa: trocar email/senha de qualquer usuário (de qualquer tenant) e da própria conta de super admin.

---

### 1. Causa raiz — login no tenant errado

Hoje, em `Auth.tsx` (`/:tenant/auth`) e `CrmLogin.tsx` (`/crm/:tenant/auth`), o handler chama `signInWithPassword(email, password)` e, em caso de sucesso, redireciona direto para o dashboard daquele slug. **Não há validação se o usuário autenticado pertence ao tenant da URL.** Como o Supabase Auth é global, a sessão é criada normalmente — o `AuthContext` carrega o `tenant_id` do `profiles` do usuário, mas o redirecionamento já aconteceu para o slug "errado" na URL.

Resultado: usuário do tenant Y entra em `/tenantX/dashboard` carregando dados do tenant Y. Pior, o RLS funciona (mostra dados do tenant Y), mas a URL mente.

### 2. Causa raiz — bloqueio de email cross-tenant

O Supabase Auth exige que `auth.users.email` seja **globalmente único**. Quando o Super Admin tenta criar `suporte@vouti.co` em um segundo tenant, a Edge Function `create-tenant-with-admin` (linha 137-148) detecta o conflito e retorna "A user with this email already exists" — mensagem genérica e enganosa. O usuário NÃO sabe que é uma limitação do provedor de autenticação.

### Correção

#### 2.1. Validação de tenant no login (Auth.tsx + CrmLogin.tsx)

Após `signInWithPassword` bem-sucedido, antes de redirecionar:
1. Buscar o `tenant_id` do `profiles` do usuário autenticado e o `tenant.id` correspondente ao slug da URL (via RPC `get_tenant_by_slug`).
2. Buscar se há `user_roles` com `(user_id, tenant_id_da_url)`.
3. **Exceção: super admin** (tabela `super_admins`) — pode entrar em qualquer tenant.
4. Se nenhum role existe naquele tenant E não é super admin: chamar `supabase.auth.signOut()`, mostrar toast "Este email não tem cadastro neste cliente. Verifique o endereço ou faça login no cliente correto." e **não navegar**.
5. Se passa, redireciona normalmente.

Mesma lógica aplicada nos dois fluxos de login (jurídico e CRM).

#### 2.2. Mensagem clara ao tentar criar email duplicado

Em `create-tenant-with-admin/index.ts` (linha 145) e `create-tenant-admin/index.ts` (linha 125), trocar a mensagem genérica por:

> "O email **{email}** já está cadastrado em outro cliente. Por uma limitação do sistema de autenticação (Supabase), cada email só pode existir em um único cliente. Use um email diferente (ex: `suporte+demorais@vouti.co`)."

Mesma melhoria em `create-user/index.ts` (linha 93). A regra de bloqueio é mantida — só a comunicação fica honesta.

#### 2.3. Nova aba "Usuários" no Super Admin

**Aba global** (entre "Clientes" e "Leads" em `SuperAdmin.tsx`):

- **Card 1 — Minha conta de Super Admin**: trocar senha do super admin logado (com confirmação).
- **Card 2 — Lista global de usuários**: tabela com `nome | email | tenant | roles | ações`. Filtros por tenant (select) e busca por nome/email. Cada linha tem botões "Editar nome/email", "Trocar senha" e "Excluir" (com confirmação). Ignora outros sistemas (`@metalsystem.local`, `@vouti.bio`, `@vlink.bio`). Inclui super admins (marcados com badge).

**Drawer por tenant**: novo botão "Usuários" no `TenantCard` (após "Configurar"), abre `TenantUsersDrawer` com a mesma tabela filtrada por aquele tenant.

**Edge Functions necessárias** (novas, super-admin-scoped):

- `super-admin-update-user` — recebe `{ user_id, email?, full_name?, password? }`. Valida que o caller é super admin (tabela `super_admins`). Atualiza `auth.users` (email/senha via Admin API) e `profiles` (email/full_name). Bloqueia mudança para um email já existente em outro auth user (mensagem clara).
- `super-admin-delete-user` — valida super admin, chama `auth.admin.deleteUser`. Não permite excluir a si mesmo.
- `super-admin-update-own-password` — caller troca a própria senha (verificação dupla com senha atual via `signInWithPassword` antes do `updateUser`).

RPC reutilizada: `get_users_with_roles_by_tenant` (já permite super admin acessar qualquer tenant).

### Arquivos afetados

**Modificados:**
- `src/pages/Auth.tsx` — validação pós-login (`handleSignIn`).
- `src/pages/CrmLogin.tsx` — validação pós-login (`handleSignIn`).
- `supabase/functions/create-tenant-with-admin/index.ts` — mensagem de erro clara (email duplicado).
- `supabase/functions/create-tenant-admin/index.ts` — mensagem de erro clara.
- `supabase/functions/create-user/index.ts` — mensagem de erro clara.
- `src/pages/SuperAdmin.tsx` — adicionar botão "Usuários" no menu (entre Clientes e Leads) e `TabsContent value="usuarios"`.
- `src/components/SuperAdmin/TenantCard.tsx` — adicionar botão "Usuários" no dropdown "Configurar" (abre `TenantUsersDrawer`).

**Novos:**
- `src/components/SuperAdmin/SuperAdminUsuarios.tsx` — aba global (super admin self-card + lista global).
- `src/components/SuperAdmin/TenantUsersDrawer.tsx` — drawer por tenant (lista + ações).
- `src/components/SuperAdmin/EditUserDialog.tsx` — dialog reusable para editar nome/email.
- `src/components/SuperAdmin/ChangeUserPasswordDialog.tsx` — dialog reusable para trocar senha.
- `supabase/functions/super-admin-update-user/index.ts`
- `supabase/functions/super-admin-delete-user/index.ts`
- `supabase/functions/super-admin-update-own-password/index.ts`
- `supabase/config.toml` — registrar as 3 novas funções.

### Impacto

**Usuário final (UX):**
- Login passa a ser **estritamente isolado por tenant**: tentar entrar em `/tenant1` com conta de `/tenant2` mostra "não tem cadastro aqui" e nem cria sessão.
- Super admin continua podendo acessar qualquer tenant via URL (comportamento intencional).
- Mensagem clara e educativa quando email já está em outro tenant — usuário entende que é limitação do Supabase, não bug.
- Super admin ganha controle total: troca senha/email de qualquer usuário, deleta usuários, troca a própria senha — tudo em um painel só.

**Dados:**
- Zero migrations de schema. Apenas 3 novas Edge Functions (deploy automático).
- Nenhuma RLS alterada — Edge Functions usam service role com validação de super admin no início.

**Riscos colaterais:**
- Login mais estrito pode confundir quem hoje "logava no slug errado e funcionava". Sugestão: incluir no toast um link "Voltar ao seletor de tenants".
- Edge Functions com service role precisam de verificação rigorosa de super admin (já é padrão das outras funções desse domínio).
- Não há mudança no fluxo de criação de tenant — o bloqueio de email duplicado se mantém (regra do Supabase).

**Quem é afetado:**
- Todos os usuários (nova validação no login).
- Super admins (novo painel "Usuários").
- Admins de tenant: nenhum impacto — gestão deles continua em `/tenant/dashboard`.

### Validação

1. Acessar `/tenant1/auth` com email/senha válidos do tenant2 → toast "não tem cadastro neste cliente" + permanece no login.
2. Acessar `/tenant1/auth` com credenciais corretas do tenant1 → entra normalmente.
3. Logar como super admin em `/tenant1/auth` → entra (acesso master mantido).
4. Mesmo teste em `/crm/:tenant/auth` (CRM standalone).
5. Tentar criar usuário com email já existente em outro tenant via Super Admin → erro com mensagem educativa explicando a limitação.
6. Aba "Usuários" no Super Admin → trocar senha do próprio super admin → fazer logout → logar com senha nova → ok.
7. Editar email de um usuário comum → próximo login dele exige novo email.
8. Drawer "Usuários" no card de um tenant → lista correta, ações funcionam, filtro respeitado.
9. Tentar trocar email para um já existente em outro tenant → erro claro.
10. Excluir usuário pela aba global → confirmação, exclusão, lista atualiza.

