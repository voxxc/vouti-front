

## Refresh único após criação de prazo (sem polling contínuo)

### Problema
O polling a cada 5s é desnecessário e desperdiça queries. O que o usuário quer é: **após criar um prazo, a aba Prazos atualiza automaticamente 1 vez**.

### Solução
Usar um **CustomEvent** do browser como bridge entre os componentes:

1. **`CreateDeadlineDialog.tsx`** — após criar o prazo com sucesso, dispara `window.dispatchEvent(new CustomEvent('deadline-created'))`
2. **`PrazosCasoTab.tsx`** — escuta esse evento e faz um `fetchPrazos(true)` (refresh silencioso). Remove o polling de 5s.

### Alterações

**`src/components/Project/CreateDeadlineDialog.tsx`** (1 linha)
- Após `toast({ title: 'Prazo criado com sucesso!' })`, adicionar:
  `window.dispatchEvent(new CustomEvent('deadline-created'));`

**`src/components/Controladoria/PrazosCasoTab.tsx`**
- Remover o `useEffect` do polling de 5s (linhas 128-135)
- Adicionar `useEffect` que escuta o evento `deadline-created` e chama `fetchPrazos(true)`

```typescript
useEffect(() => {
  const handler = () => fetchPrazos(true);
  window.addEventListener('deadline-created', handler);
  return () => window.removeEventListener('deadline-created', handler);
}, [fetchPrazos]);
```

### Resultado
- Zero polling contínuo
- Atualização instantânea após criação
- Comunicação leve entre componentes sem prop drilling

| Arquivo | Mudança |
|---------|---------|
| `CreateDeadlineDialog.tsx` | Disparar evento `deadline-created` |
| `PrazosCasoTab.tsx` | Escutar evento e refresh 1x, remover polling 5s |

