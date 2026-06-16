## Causa raiz

**1) Página de reset não abre**
O link do e-mail de recuperação do Supabase chega no formato novo (`?token_hash=...&type=recovery`) e não cai mais num hash com `access_token`. O `SpnResetPassword.tsx` só escuta `onAuthStateChange` esperando uma sessão aparecer sozinha — mas com `token_hash` é preciso chamar `supabase.auth.verifyOtp({ type: 'recovery', token_hash })` explicitamente. Sem isso, a página carrega, nunca fica "ready" e, se o link foi clicado em outro lugar, cai em `/not-found` (que é o que o cliente está mostrando agora).

**2) Confirmação de e-mail no cadastro**
O `signUp` está sujeito à configuração "Confirm email" do Supabase Auth, que está ligada no projeto. Por isso novas contas SPN ficam pendentes até confirmar e-mail. Isso é controlado no painel do Supabase, não no código do app — então a correção é desligar essa opção (e ajustar o `signUp` para não esperar confirmação).

---

## Correção

### A. SpnResetPassword.tsx — tratar `token_hash`
- No `useEffect`, ler `searchParams`:
  - Se houver `token_hash` + `type=recovery` (ou `type` qualquer de recovery), chamar `supabase.auth.verifyOtp({ type: 'recovery', token_hash })`. Em sucesso, `setReady(true)` e limpar a query da URL.
  - Manter o fallback que escuta `onAuthStateChange` para sessão existente (links antigos com hash).
  - Se nenhum dos dois rolar em ~3s, mostrar mensagem clara ("Link inválido ou expirado — solicite novamente").
- Sem mudanças visuais.

### B. Garantir que `/spn/reset-password` é pública
- A rota já existe em `App.tsx` (linha 758) fora de qualquer guard — confirmar que está antes de qualquer catch-all `*` e que não exige `SpnAuthProvider` (não exige, ok).

### C. SpnAuthContext.signUp — sem confirmação de e-mail
- Remover `emailRedirectTo` (não usaremos mais e-mail de confirmação).
- Após `supabase.auth.signUp`, se vier `session` no retorno, o usuário já está logado e cai direto no dashboard. Se ainda vier `null` (porque a flag do Supabase ainda está ligada), fazer um `signInWithPassword` imediato como fallback, para o usuário entrar sem precisar confirmar.

### D. Desligar "Confirm email" no painel Supabase
- O usuário precisa abrir Authentication → Providers → Email e desmarcar **"Confirm email"**. Sem isso, qualquer signUp continua exigindo confirmação. Vou deixar o link pronto no final do plano.

---

## Arquivos afetados

- `src/pages/SpnResetPassword.tsx` — tratar `token_hash` via `verifyOtp`, melhorar estados de loading/erro.
- `src/contexts/SpnAuthContext.tsx` — remover `emailRedirectTo` do signUp e fazer auto‑login pós‑cadastro.

(Nenhuma mudança em migration, RLS ou outros arquivos.)

---

## Impacto

**Usuário final (UX, telas, fluxos)**
- Quem clica no link de "Esqueci minha senha" passa a abrir `/spn/reset-password` corretamente, define a nova senha e é redirecionado para `/spn/auth`.
- Novos cadastros SPN entram direto no app sem precisar abrir e-mail — fluxo mais rápido, sem tela de "verifique seu e-mail".
- Cadastros antigos pendentes de confirmação continuam pendentes até a flag ser desligada no painel.

**Dados (migrations, RLS, performance)**
- Nenhuma mudança de schema, RLS ou índice. Sem migration.
- `spn_profiles` e `spn_user_roles` continuam sendo populados no signUp como hoje.

**Riscos colaterais**
- Desligar "Confirm email" reduz a barreira contra cadastro com e-mail falso — aceitável para SPN porque o produto é fechado/educacional e o admin controla roles.
- A flag "Confirm email" é global do projeto Supabase: vale para **todos os outros apps** que usam o mesmo Supabase (Vouti, CRM, Metal, Batink, VoTech, Link, etc.). Se algum deles depende de confirmação de e-mail, isso quebra esse comportamento. Recomendação: verificar antes de desligar; se for problema, manter ligado e só implementar o auto‑login pós‑signUp como mitigação (cadastro continua criando usuário não-confirmado, mas o auto‑login falha — nesse caso o ideal é criar uma edge function `spn-signup` com `service_role` + `email_confirm: true` apenas para o SPN).

**Quem é afetado**
- Apenas usuários SPN no fluxo de cadastro e de redefinição de senha.
- Indiretamente, todos os outros produtos do Supabase compartilhado, caso a flag global seja desligada.

---

## Validação

1. Abrir `/spn/auth`, clicar em "Esqueci minha senha", informar e‑mail real e enviar.
2. Abrir o link recebido — deve cair em `/spn/reset-password` com o formulário visível.
3. Definir nova senha → toast de sucesso → redirecionar para `/spn/auth` → logar com a nova senha.
4. Em `/spn/auth` aba "Create Account", cadastrar nova conta — deve entrar direto no dashboard sem pedir confirmação de e-mail (após desligar a flag no painel).
5. Se o passo 4 ainda pedir confirmação, é sinal de que a flag do Supabase ainda está ligada — abrir o painel e desmarcar.

---

<presentation-actions>
<presentation-link href="https://supabase.com/dashboard/project/ietjmyrelhijxyozcequ/auth/providers">Abrir configuração do Auth (desmarcar "Confirm email")</presentation-link>
</presentation-actions>
