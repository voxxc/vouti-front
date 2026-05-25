## Causa raiz (3 hipóteses, todas observadas no código)

### 1) Reset por email (`Esqueci minha senha` em `/vargas/auth`)
A `send-password-reset` envia o link **hardcoded** para `https://vouti.lovable.app/${tenant_slug}/reset-password/${code}`. O tenant Vargas usa o domínio de produção `vouti.co`. Quando o usuário clica no email, é levado para o domínio Lovable (não o custom domain), o que:
- causa estranheza/desconfiança (link parece quebrado),
- pode disparar bloqueios de cookie/sessão e
- se o usuário recolar o código manualmente no `vouti.co/vargas/auth` não há tela pra colar o código (a tela só aceita link).

### 2) Alterar a própria senha (Extras → Perfil)
A função `update-own-password` valida a senha atual fazendo `signInWithPassword` num cliente "throwaway". Com as **novas signing keys (assimétricas) da Supabase**, esse `signInWithPassword` paralelo:
- pode emitir um novo refresh token e **rotacionar/invalidar o token ativo do navegador**, fazendo o usuário cair em "Sessão expirada" antes mesmo do `updateUserById` ocorrer,
- ou retornar 400 silencioso quando há rate-limit por IP, transformando uma senha correta em "Senha atual incorreta".
Além disso, ainda usa `auth.getUser(token)` em vez do padrão atual `auth.getClaims(token)` (todas as outras funções já migraram).

### 3) Admin trocando senha de outro usuário do tenant
`admin-update-user-credentials` está OK em si, mas no Vargas só existe **1 usuário** (`jarifilho@hotmail.com`, admin). Não há UI em `/vargas` para o admin trocar a própria senha por esse caminho — o único path é o (2) acima. Logo, se (2) falha, o admin do Vargas fica sem alternativa interna.

## Correção

### Fix #1 — `update-own-password` (raiz mais provável)
Reescrever para:
- Verificar JWT com `getClaims(token)` (padrão atual do projeto).
- **Não usar `signInWithPassword` para validar** a senha atual. Em vez disso, chamar diretamente a Auth REST `POST /auth/v1/token?grant_type=password` com `apikey: anon` e tratar o response sem salvar sessão (igual ao verifier, porém com `xform: ignore` e logout imediato do token emitido via `admin.auth.admin.signOut(newAccessToken)`). Isso impede a rotação do refresh token do usuário.
- Mensagens de erro mais específicas (`Senha atual incorreta` vs `Limite de tentativas` vs `Erro interno`).
- Registrar `tenant_id` e `slug` no log p/ rastreabilidade futura.

### Fix #2 — `send-password-reset` (link)
- Trocar o hardcode `vouti.lovable.app` por **origin dinâmico**: ler `req.headers.get('origin')` e fazer fallback para `https://vouti.co`. Assim Vargas (e qualquer tenant em custom domain) recebe link na origem correta.
- Validar que a origem está numa allowlist (`vouti.co`, `vouti.lovable.app`, `*.lovableproject.com`) para evitar open-redirect.

### Fix #3 — UI no `/tenant/auth` aceitar código manual
Adicionar na `Auth.tsx` (modo `recovery`) um botão "Já tenho o código" que leva para um pequeno form (`email + código + nova senha`) que chama `verify-password-reset` diretamente. Resolve o caso do usuário do Vargas que recebeu o link, mas o link aponta pro domínio errado — ele consegue colar o código e seguir.

### Fix #4 — Telemetria
Adicionar `console.log` estruturado no início e fim de `update-own-password` e `send-password-reset` para que esse tipo de chamado tenha logs (hoje `update-own-password` está sem nenhum log nas últimas execuções, o que dificulta o diagnóstico).

## Arquivos afetados

- `supabase/functions/update-own-password/index.ts` — reescrita (Fix #1, #4)
- `supabase/functions/send-password-reset/index.ts` — origin dinâmico + allowlist + logs (Fix #2, #4)
- `src/pages/Auth.tsx` — novo subfluxo "Já tenho o código" no modo `recovery` (Fix #3)
- `src/pages/CrmLogin.tsx` — mesmo subfluxo, para o produto CRM standalone (consistência)

## Impacto

**(1) Usuário final / UX**
- Vargas (e todos os tenants em domínio próprio) passam a conseguir trocar senha pela tela Extras → Perfil sem ser deslogado no meio do processo.
- Email de recuperação passa a apontar para o domínio do qual a pessoa solicitou (vouti.co para Vargas/Solvenza no custom domain; vouti.lovable.app em preview).
- Surge um caminho alternativo "Já tenho o código" em `/tenant/auth`, útil quando o email chega com link quebrado/bloqueado.

**(2) Dados**
- Zero migrations. Nenhuma alteração em tabelas, RLS, índices ou storage.
- Tabela `password_reset_codes` continua igual; só passa a ser usada com mais consistência.

**(3) Riscos colaterais**
- A allowlist de origem precisa cobrir os domínios reais (vouti.co, vouti.lovable.app, *.lovableproject.com); se faltar algum, o reset cai em fallback de produção — não quebra, só perde o "voltar pro mesmo domínio".
- O subfluxo "código manual" reaproveita `verify-password-reset` que **já existe e está testado**, sem novas superfícies de ataque.
- A remoção do `signInWithPassword` no `update-own-password` muda a forma de validar a senha atual; se a Auth REST mudar de contrato, a validação falha — mitigado mantendo o teste por `400 invalid_grant`.

**(4) Quem é afetado**
- **Todos os tenants** (Solvenza, Vargas, Jari Vargas, etc.) — não é fix específico do Vargas; só foi exposto lá porque ele tem 1 usuário só e não tem rota alternativa.
- Admin/controller continuam usando `admin-update-user-credentials` (inalterado) para trocar senha de outros usuários do tenant.
- Super Admin não é afetado (funções `super-admin-*` separadas).

## Validação

1. Em `/vargas/auth` → "Esqueci minha senha" → conferir nos logs de `send-password-reset` que `origin` foi capturado e o link no email aponta para `vouti.co/vargas/reset-password/{code}`.
2. No email, clicar no link → tela `ResetPassword` abre → trocar senha → login funciona com nova senha.
3. Alternativo: em `/vargas/auth` → "Já tenho o código" → colar email + código + nova senha → sucesso.
4. Logar como `jarifilho@hotmail.com` → Extras → Perfil → "Alterar senha" com senha atual correta → toast de sucesso → relogin com a nova senha (sessão antiga encerrada por logout intencional após sucesso, como já é hoje).
5. Repetir o passo 4 com senha atual **errada** → toast "Senha atual incorreta" (não "Erro interno").
6. Conferir nos Edge Function logs do Supabase que `update-own-password` agora registra início/fim com tenant_id.