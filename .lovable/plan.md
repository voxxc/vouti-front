

## Plano: Corrigir Crash na Seção de Contatos do Super Admin

### Diagnóstico

O componente `WhatsAppContacts` usa o hook `useAuth()` na linha 40, mas a rota `/super-admin/bot` não possui `AuthProvider`.

**Código atual (linha 40):**
```tsx
const { user } = useAuth();  // ❌ Crash no Super Admin
```

---

### Solução

Aplicar a mesma correção feita no `SaveContactDialog`: substituir `useAuth()` por busca direta via `supabase.auth.getUser()`.

---

### Alteração Proposta

**Arquivo:** `src/components/WhatsApp/sections/WhatsAppContacts.tsx`

**Antes:**
```tsx
import { useAuth } from "@/contexts/AuthContext";

export const WhatsAppContacts = () => {
  const { user } = useAuth();
  // ...
  if (!user?.id) return;
```

**Depois:**
```tsx
// Remover import do useAuth

export const WhatsAppContacts = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Buscar usuário diretamente do Supabase
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);
  
  // ...
  if (!currentUserId) return;
```

---

### Resultado Esperado

| Antes | Depois |
|-------|--------|
| Crash ao clicar em "Contatos" | Funciona normalmente |
| Requer AuthProvider | Compatível com qualquer contexto |

---

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/WhatsApp/sections/WhatsAppContacts.tsx` | Substituir `useAuth()` por `supabase.auth.getUser()` |

