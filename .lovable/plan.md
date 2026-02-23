

## Por que tantas queries estao sendo disparadas

### Causa raiz: `useTenantId` sem cache

O hook `useTenantId` e usado em **97 componentes** do projeto. Cada instancia do hook faz **2-3 queries ao banco** toda vez que monta:

1. `supabase.auth.getUser()` - chamada de auth
2. `SELECT id FROM super_admins WHERE user_id = ...` - verificar se e super admin
3. `SELECT tenant_id FROM profiles WHERE user_id = ...` - buscar tenant

Nos network requests capturados do dashboard, podemos ver **4 chamadas a `super_admins`** e **4 chamadas a `profiles`** simultaneas, todas identicas. Isso porque multiplos componentes na mesma pagina (sidebar, dashboard cards, central, prefetch, etc.) montam ao mesmo tempo, e cada um instancia seu proprio `useTenantId`.

Com 97 componentes usando este hook, uma pagina que monta 10 deles gera **30 queries desnecessarias** so para descobrir o tenant_id (que e sempre o mesmo valor para um mesmo usuario).

### Solucao: Cache global com React Context

Mover a logica do `useTenantId` para um **TenantContext** (similar ao `AuthContext` existente). O tenant_id sera buscado **uma unica vez** no provider, e todos os 97 componentes consomem o valor do contexto sem query adicional.

### Alteracoes

**1. Criar `src/contexts/TenantContext.tsx`**

```typescript
// Provider que busca tenant_id UMA vez
// Expoe via context para todos os filhos
const TenantProvider = ({ children }) => {
  // Mesma logica atual do useTenantId, mas executada 1x
  // Extrai urlTenantId do pathname (ex: /solvenza/...)
};

export const useTenantId = () => useContext(TenantContext);
```

**2. Montar provider no `App.tsx`**

Adicionar `<TenantProvider>` abaixo do `AuthProvider`, envolvendo as rotas.

**3. Atualizar `src/hooks/useTenantId.ts`**

Re-exportar do contexto novo para manter compatibilidade com os 97 imports existentes:

```typescript
export { useTenantId } from '@/contexts/TenantContext';
```

Assim **nenhum dos 97 arquivos** precisa ser alterado.

### Impacto

| Metrica | Antes | Depois |
|---|---|---|
| Queries `super_admins` por page load | 4-10+ | 1 |
| Queries `profiles` por page load | 4-10+ | 1 |
| Total queries/pagina eliminadas | ~20-30 | ~2-3 |

### Arquivos alterados

- **Novo**: `src/contexts/TenantContext.tsx`
- `src/hooks/useTenantId.ts` - re-export do context
- `src/App.tsx` (ou layout raiz) - montar TenantProvider

