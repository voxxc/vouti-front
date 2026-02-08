
# Plano: Corrigir URLs das Landing Pages por Tenant

## Problema
As landing pages no `CRMContent.tsx` estão abrindo URLs globais (`/landing-1`, `/office`) em vez de URLs específicas do tenant (`/demorais/landing-1`, `/demorais/office`).

## Causa
A lista de landing pages usa caminhos hardcoded e não utiliza o `tenantPath()` ao abrir as páginas.

## Comparação

| Componente | Código Atual | Código Correto |
|------------|--------------|----------------|
| CRM.tsx (página) | `tenantPath('/landing-1')` | ✅ Correto |
| CRMContent.tsx (drawer) | `lp.path` → `/landing-1` | ❌ Incorreto |

## Solução

Modificar o `CRMContent.tsx` para usar `tenantPath()` ao abrir as landing pages:

### Alteração no Dialog de Landing Pages (linha 331)

**Antes:**
```typescript
onClick={() => {
  window.open(lp.path, '_blank');
  setIsLandingPagesDialogOpen(false);
}}
```

**Depois:**
```typescript
onClick={() => {
  window.open(tenantPath(lp.path), '_blank');
  setIsLandingPagesDialogOpen(false);
}}
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/CRM/CRMContent.tsx` | Usar `tenantPath(lp.path)` ao invés de `lp.path` no onClick do dialog |

## Resultado Esperado
- Tenant `demorais` abre: `/demorais/landing-1`, `/demorais/office`
- Tenant `solvenza` abre: `/solvenza/landing-1`, `/solvenza/office`
- Cada tenant acessa suas próprias landing pages
