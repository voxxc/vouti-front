

## Plano: Corrigir Crash na Caixa de Entrada do Super Admin

### Diagnóstico

O crash ocorre porque o componente `SaveContactDialog` usa o hook `useAuth()`, mas a rota `/super-admin/bot` **não está envolvida pelo `AuthProvider`**.

**Fluxo do erro:**

```text
/super-admin/bot
    └── SuperAdminWhatsApp (SEM AuthProvider)
        └── SuperAdminWhatsAppLayout
            └── SuperAdminWhatsAppInbox
                └── ContactInfoPanel (renderizado ao selecionar conversa)
                    └── SaveContactDialog
                        └── useAuth() ← CRASH!
```

**Erro exato:**
```
Error: useAuth must be used within an AuthProvider
```

---

### Solução

Modificar o `SaveContactDialog` para **não depender do `useAuth()`** diretamente. Em vez disso, buscar o usuário diretamente do Supabase, tornando o componente compatível com qualquer contexto.

---

### Alteração Proposta

**Arquivo:** `src/components/WhatsApp/components/SaveContactDialog.tsx`

**Antes:**
```tsx
import { useAuth } from "@/contexts/AuthContext";

export const SaveContactDialog = (...) => {
  const { user } = useAuth();  // ❌ Requer AuthProvider
  // ...
  created_by: user?.id,
};
```

**Depois:**
```tsx
import { supabase } from "@/integrations/supabase/client";

export const SaveContactDialog = (...) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    // Buscar usuário diretamente do Supabase Auth
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);
  
  // ...
  created_by: currentUserId,
};
```

---

### Benefícios

| Aspecto | Resultado |
|---------|-----------|
| **Compatibilidade** | Funciona com ou sem AuthProvider |
| **Super Admin** | Não crasha mais ao clicar em conversas |
| **Tenants** | Continua funcionando normalmente |
| **Simplicidade** | Mudança mínima, sem refatoração grande |

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/WhatsApp/components/SaveContactDialog.tsx` | Substituir `useAuth()` por `supabase.auth.getUser()` |

