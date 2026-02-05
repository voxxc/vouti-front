
# Correção: Projetos Não Carregam no Tenant Solvenza

## Problemas Identificados

### Bug 1: Race Condition com `tenantId`
O `useEffect` principal que dispara `fetchBasicProjects` depende de `user` mas **NÃO inclui `tenantId`** como dependência. Quando o drawer abre:

```text
Timeline:
  0ms: useEffect dispara com tenantId = null
  5ms: fetchBasicProjects() retorna imediatamente (linha 62: if (!tenantId) return)
 50ms: useTenantId termina, tenantId = "27492091-..."
       useEffect NÃO re-executa porque tenantId não está nas deps
```

**Evidência**: No request de rede, a query NÃO tem filtro `tenant_id`:
```
GET ...projects?select=...&order=name.asc  ← Falta tenant_id=eq.XXX
```

### Bug 2: `checkIfUserIsAdminOrController` sem tenant
```typescript
// Linha 54 - NÃO passa tenantId
const result = await checkIfUserIsAdminOrController(user.id);
```
Isso pode retornar `false` mesmo para admins do tenant correto.

### Bug 3: `isBasicLoaded` nunca se torna `true`
Quando `tenantId` é `null`, a função retorna sem setar `isBasicLoaded = true`, deixando o drawer eternamente em loading.

---

## Solução

### Arquivo: `src/hooks/useProjectsOptimized.ts`

| Linha | Problema | Correção |
|-------|----------|----------|
| 54 | Não passa tenantId | `checkIfUserIsAdminOrController(user.id, tenantId)` |
| 61-62 | Early return não seta isBasicLoaded | Adicionar `setIsBasicLoaded(true)` antes do return |
| 376-392 | useEffect sem tenantId nas deps | Adicionar `tenantId` como dependência do loadData |

### Correções Específicas

**1. Passar `tenantId` para verificação de admin:**
```typescript
// Antes:
const hasFullAccess = await checkAdminOrController();

// Depois:
const hasFullAccess = await checkIfUserIsAdminOrController(user.id, tenantId);
```

**2. Garantir que early return sete loading state:**
```typescript
const fetchBasicProjects = useCallback(async () => {
  if (!user || !tenantId) {
    // Se não tem tenantId, não busca mas sinaliza que acabou de tentar
    return [];
  }
  // ...resto do código
}, [user, tenantId, toast]);
```

**3. Adicionar `tenantId` nas dependências do useEffect:**
```typescript
useEffect(() => {
  if (!user || !tenantId) return; // Esperar tenantId estar disponível

  const loadData = async () => {
    const basicProjects = await fetchBasicProjects();
    // ...
  };

  loadData();
}, [user, tenantId, fetchBasicProjects, fetchProjectDetails]);
//         ^^^^^^^^ ADICIONAR tenantId
```

---

## Fluxo Corrigido

```text
Após correção:
  0ms: useEffect dispara com tenantId = null → return (não faz nada)
 50ms: tenantId = "27492091-..."
       useEffect RE-EXECUTA porque tenantId está nas deps
       fetchBasicProjects() busca com .eq('tenant_id', tenantId)
       Projetos carregam corretamente ✓
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useProjectsOptimized.ts` | 1. Passar `tenantId` para `checkIfUserIsAdminOrController` |
| | 2. Adicionar `tenantId` nas dependências do useEffect principal |
| | 3. Melhorar guards para esperar `tenantId` antes de buscar |

---

## Resultado Esperado

- Projetos do tenant Solvenza carregarão instantaneamente quando o drawer abrir
- Filtro `tenant_id` será aplicado corretamente na query
- Sem race conditions entre carregamento do tenant e fetch dos projetos
