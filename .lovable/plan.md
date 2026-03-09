

## Problema Real

Todas as correções anteriores foram feitas no componente **errado** (`PrazosCasoTab` / `ProcessoOABDetalhes`). O que o usuário vê na screenshot ("Nenhum prazo vinculado às etapas") vem de **`ProjectProtocoloContent.tsx`** -- a aba Prazos dentro do protocolo no **Project drawer**.

Este componente:
1. Busca prazos em `fetchPrazosVinculados()` apenas no mount (via `useEffect` com `protocolo?.etapas`)
2. **Nunca escuta** o evento `deadline-created`
3. Portanto, ao criar um prazo e fechar o dialog, a lista permanece vazia até o drawer ser reaberto

## Solução

Adicionar um listener para o evento `deadline-created` em `ProjectProtocoloContent.tsx` que re-executa `fetchPrazosVinculados()`.

### Alteração em `src/components/Project/ProjectProtocoloContent.tsx`

Adicionar um `useEffect` logo após o useEffect existente (linha ~169):

```typescript
useEffect(() => {
  const handler = () => {
    fetchPrazosVinculados();
  };
  window.addEventListener('deadline-created', handler);
  return () => window.removeEventListener('deadline-created', handler);
}, [protocolo?.etapas]);
```

Isso faz com que, ao criar um prazo no `CreateDeadlineDialog` (que já dispara `window.dispatchEvent(new CustomEvent('deadline-created'))`), a lista seja re-buscada automaticamente.

Uma alteração. Um arquivo. Sem complexidade adicional.

