

## Diagnóstico: Erro "Não autenticado" ao criar usuário

Os logs da Edge Function `create-user` mostram repetidamente:

```
AuthSessionMissingError: Auth session missing!
Error in create-user function: Error: Não autenticado
```

**Causa:** O token de autenticação enviado na requisição é inválido ou inexistente. O `supabase.functions.invoke` envia automaticamente o token da sessão ativa. Se o usuário não está logado (ou a sessão expirou), o token enviado é o `anon key`, que não é um token de usuário valido, fazendo `getUser(token)` falhar.

Na sessão atual, você está na rota `/` (landing page), ou seja, **sem sessão autenticada**. Para criar usuários, é necessário estar logado como admin dentro de um tenant (ex: `/solvenza/dashboard`).

**Adicionalmente**, a Edge Function importa `@supabase/supabase-js@2.58.0` (versão antiga). Atualizar para a mesma versão do projeto (`2.80.0`) evita inconsistências.

## Plano de Correção

### 1. Melhorar validação do token na Edge Function
**Arquivo:** `supabase/functions/create-user/index.ts`

- Atualizar import para `@supabase/supabase-js@2` (latest)
- Antes de chamar `getUser(token)`, verificar se o token não é vazio ou igual ao anon key
- Retornar mensagem de erro mais clara: "Faça login como administrador antes de criar usuários"

### 2. Melhorar tratamento de erro no frontend
**Arquivo:** `src/components/Admin/UserManagementDrawer.tsx`

- Verificar se existe sessão ativa antes de chamar a Edge Function
- Se não houver sessão, mostrar toast com mensagem orientando o login

Essas mudanças são preventivas. O problema principal é garantir que o usuário esteja logado ao tentar criar um novo usuário.

