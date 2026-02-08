
# Correção do Email de Recuperação de Senha

## Diagnóstico

Analisando o código de recuperação de senha:

1. **Auth.tsx** - O fluxo de solicitação está correto:
   ```typescript
   const redirectUrl = `${window.location.origin}/${tenantSlug}/reset-password`;
   await resetPassword(email, redirectUrl);
   ```

2. **AuthContext.tsx** - A função usa o método nativo do Supabase:
   ```typescript
   const resetPassword = async (email: string, redirectUrl: string) => {
     const { error } = await supabase.auth.resetPasswordForEmail(email, {
       redirectTo: redirectUrl,
     });
     return { error };
   };
   ```

3. **ResetPassword.tsx** - A página de redefinição tem um problema: não processa os parâmetros do URL que o Supabase envia (access_token, refresh_token, type=recovery).

## Problema Principal

Quando o Supabase envia o email de recuperação, o link contém parâmetros de autenticação no fragmento do URL:
```
https://vouti.lovable.app/demorais/reset-password#access_token=xxx&refresh_token=yyy&type=recovery
```

A página `ResetPassword.tsx` precisa:
1. Detectar esses parâmetros
2. Estabelecer a sessão com o token de recovery
3. Só então permitir que o usuário atualize a senha

Atualmente, a página não faz isso - ela simplesmente tenta atualizar a senha sem verificar se há uma sessão válida de recovery.

## Solução

### Arquivo: `src/pages/ResetPassword.tsx`

Adicionar lógica para processar os parâmetros de recovery do URL:

```typescript
useEffect(() => {
  // Processar hash params do Supabase (type=recovery)
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  const type = hashParams.get('type');

  if (type === 'recovery' && accessToken && refreshToken) {
    // Estabelecer sessão com tokens de recovery
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    }).then(({ error }) => {
      if (error) {
        console.error('Erro ao estabelecer sessão:', error);
        toast({
          title: "Link inválido",
          description: "O link de recuperação expirou ou é inválido.",
          variant: "destructive",
        });
        navigate(`/${tenantSlug}/auth`);
      } else {
        setSessionReady(true);
        // Limpar hash da URL para segurança
        window.history.replaceState(null, '', window.location.pathname);
      }
    });
  } else {
    // Verificar se já tem sessão válida
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        toast({
          title: "Acesso não autorizado",
          description: "Use o link enviado para seu email.",
          variant: "destructive",
        });
        navigate(`/${tenantSlug}/auth`);
      }
    });
  }
}, []);
```

### Mudanças Específicas

1. **Adicionar import do supabase client**
2. **Adicionar estado `sessionReady`** para controlar quando o formulário pode ser exibido
3. **Adicionar useEffect** para processar tokens de recovery
4. **Mostrar loading** enquanto processa os tokens
5. **Validar sessão** antes de permitir atualização

## Fluxo Corrigido

```text
Usuário solicita reset
       │
       ▼
Supabase envia email com link
       │
       ▼
Link: /{tenant}/reset-password#access_token=xxx&type=recovery
       │
       ▼
┌─────────────────────────────────────────┐
│ ResetPassword.tsx detecta parâmetros    │
│ ─► Chama setSession() com tokens        │
│ ─► Estabelece sessão de recovery        │
│ ─► Habilita formulário de nova senha    │
└─────────────────────────────────────────┘
       │
       ▼
Usuário digita nova senha
       │
       ▼
updatePassword() funciona (tem sessão)
```

## Configurações Necessárias no Supabase

Além da correção no código, verificar no Supabase Dashboard:

1. **Authentication > URL Configuration**:
   - Site URL: `https://vouti.lovable.app`
   - Redirect URLs: Adicionar `https://vouti.lovable.app/*/reset-password` (com wildcard para tenants)

2. **Authentication > Email Templates**:
   - Verificar se o template "Reset Password" está configurado
   - O `{{ .ConfirmationURL }}` deve estar presente no template
