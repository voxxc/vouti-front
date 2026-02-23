

## Corrigir redirecionamento de logout do CRM

### Problema
Ao deslogar do CRM integrado (`/demorais/crm`), o usuario e redirecionado para `/crm/demorais/auth` (rota do CRM standalone), quando deveria ir para `/demorais/auth` (rota de auth do sistema integrado).

Isso acontece porque o `handleLogout` no `CRMTopbar.tsx` sempre usa o path do CRM standalone:
```
navigate(`/crm/${tenant}/auth`)
```

### Solucao

Detectar em qual contexto o CRM esta rodando (integrado vs standalone) verificando a URL atual, e redirecionar para o auth correto.

**Arquivo:** `src/components/WhatsApp/components/CRMTopbar.tsx`

Alterar o `handleLogout` para:

```typescript
const handleLogout = async () => {
  await supabase.auth.signOut();

  // Detectar se estamos no CRM standalone (/crm/:tenant) ou integrado (/:tenant/crm)
  const isStandalone = window.location.pathname.startsWith('/crm/');

  if (isStandalone) {
    navigate(`/crm/${tenant}/auth`, { replace: true });
  } else {
    navigate(`/${tenant}/auth`, { replace: true });
  }
};
```

Tambem corrigir a mesma logica no `CrmApp.tsx` (linha 20), que redireciona usuarios nao autenticados:

**Arquivo:** `src/pages/CrmApp.tsx`

```typescript
if (!user) {
  const isStandalone = window.location.pathname.startsWith('/crm/');
  if (isStandalone) {
    navigate(`/crm/${tenant}/auth`, { replace: true });
  } else {
    navigate(`/${tenant}/auth`, { replace: true });
  }
}
```

### Resumo

| Arquivo | Mudanca |
|---|---|
| CRMTopbar.tsx | Logout redireciona para auth correto baseado no contexto (integrado vs standalone) |
| CrmApp.tsx | Redirect de usuario nao autenticado tambem respeita o contexto |

