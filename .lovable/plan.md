

## Plano: Restringir alerta de faturas apenas para admins

### Mudança
No `DashboardLayout.tsx`, condicionar a renderização do `BillingAlertIndicator` ao `userRole === 'admin'`.

### Implementação

**Arquivo**: `src/components/Dashboard/DashboardLayout.tsx`

Na linha ~420, envolver o componente com verificação de role:

```tsx
// De:
<BillingAlertIndicator onOpenSubscription={() => setBillingDrawerOpen(true)} />

// Para:
{userRole === 'admin' && (
  <BillingAlertIndicator onOpenSubscription={() => setBillingDrawerOpen(true)} />
)}
```

O `userRole` já está disponível via `useAuth()` que já é importado no componente. Mudança de 1 linha, sem novos arquivos.

