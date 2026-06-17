## Causa raiz

A página `/spn/reset-password` continua exibindo "Link inválido ou expirado" porque o fluxo atual depende do **link de recuperação enviado pelo Supabase Auth**. Esse link só funciona se:

1. A URL `https://<dominio>/spn/reset-password` estiver na allow-list de Redirect URLs no painel do Supabase (não está — por isso o link cai em `/not-found` ou volta para a Site URL).
2. O formato do token enviado pelo Supabase (`#access_token=` ou `?token_hash=`) bater exatamente com o que o front espera.

Mesmo corrigindo o código, qualquer mudança de domínio/preview quebra de novo. O projeto já tem um fluxo robusto baseado em **código numérico por e-mail** (`send-password-reset` + `verify-password-reset` + tabela `password_reset_codes`) usado pelos tenants principais. Vou replicar esse padrão isolado para o SPN, sem nenhuma dependência de link mágico.

## Correção

**1. Novas Edge Functions (isoladas para SPN, usando `spn_profiles`):**

- `spn-send-password-reset`
  - Input: `{ email }`
  - Busca o `user_id` em `spn_profiles` (via e-mail em `auth.users`).
  - Gera código de 6 dígitos, salva em `password_reset_codes` com `tenant_slug = 'spn'` e `expires_at = now() + 15min`.
  - Rate limit: máx. 3 códigos/hora por e-mail.
  - Envia e-mail via Resend (mesmo padrão do `send-password-reset`).
  - Sempre retorna `success: true` (não vaza se o e-mail existe).

- `spn-verify-password-reset`
  - Input: `{ email, code, new_password }`
  - Valida código não-usado e não-expirado para `tenant_slug = 'spn'`.
  - Atualiza senha via `supabase.auth.admin.updateUserById`.
  - Marca código como `used_at`.

**2. `src/pages/SpnAuth.tsx`** — `handleForgot` passa a chamar `supabase.functions.invoke('spn-send-password-reset', { body: { email } })` em vez de `resetPasswordForEmail`. Após sucesso, mostra mensagem "Código enviado para seu e-mail" e um botão "Já tenho o código" que leva para `/spn/reset-password`.

**3. `src/pages/SpnResetPassword.tsx`** — Reescrita para **não depender de URL params**. Formulário com 4 campos:
- E-mail
- Código (6 dígitos)
- Nova senha
- Confirmar nova senha

Submit chama `spn-verify-password-reset`. Em sucesso: toast "Senha atualizada" → `navigate('/spn/auth')`. Sem `verifyOtp`, sem `onAuthStateChange`, sem timeout de "link inválido".

**4. Reutilizar tabela existente** `password_reset_codes` (já tem RLS, índices e expiração). Sem nova migration.

## Arquivos afetados

- **Criados:** `supabase/functions/spn-send-password-reset/index.ts`, `supabase/functions/spn-verify-password-reset/index.ts`
- **Editados:** `src/pages/SpnAuth.tsx`, `src/pages/SpnResetPassword.tsx`
- **Sem mudanças:** migrations, RLS, `SpnAuthContext.tsx`, `App.tsx` (a rota `/spn/reset-password` continua a mesma).

## Impacto

1. **UX (usuário final):** Em "Esqueci minha senha" o usuário recebe um **código de 6 dígitos** no e-mail (em vez de um link). Vai para `/spn/reset-password`, digita e-mail + código + nova senha, e está pronto. Funciona em qualquer domínio (vouti.co, preview, sandbox) sem configuração externa.
2. **Dados:** Nenhuma migration. Reusa `password_reset_codes` com `tenant_slug='spn'` para isolar dos demais tenants. Sem alteração em RLS.
3. **Riscos colaterais:** Nenhum impacto nos tenants existentes (funções isoladas). Requer que `RESEND_API_KEY` já esteja configurado (já está, pois `send-password-reset` o usa).
4. **Quem é afetado:** Apenas usuários do SPN. Outros produtos (CRM, Solvenza, VoTech, etc.) não mudam.

## Validação

1. `/spn/auth` → "Esqueci minha senha" → digitar e-mail cadastrado → ver toast "Código enviado".
2. Conferir caixa de entrada → copiar código de 6 dígitos.
3. `/spn/reset-password` → preencher e-mail + código + nova senha → ver toast "Senha atualizada" → redirect para `/spn/auth`.
4. Logar com a nova senha.
5. Tentar usar o mesmo código duas vezes → deve falhar com "Código inválido ou expirado".
