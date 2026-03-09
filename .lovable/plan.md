

## Diagnóstico real (dados do banco)

Verifiquei o banco de dados. **Todos** os deadlines recentes têm `processo_oab_id = NULL`. Isso acontece porque os protocolos de onde eles são criados também não têm `processo_oab_id` preenchido. Assim, as duas queries do `PrazosCasoTab` (direta por `processo_oab_id` e via etapas de protocolo) retornam vazio — o problema **nunca foi o refresh**, é que a query não encontra nada.

Além disso, a lógica de refresh atual pode ter edge cases (Radix `onValueChange` não dispara ao clicar na aba já ativa).

## Solução em 2 partes

### Parte 1: Forçar remount com `key` (garantia de refresh)

No `ProcessoOABDetalhes.tsx`, usar `key={prazosRefreshKey}` no `PrazosCasoTab`. Isso força React a **destruir e recriar** o componente, garantindo um fetch limpo sempre:

```tsx
<PrazosCasoTab key={prazosRefreshKey} processoOabId={processo.id} />
```

Remover a prop `refreshKey` e o useEffect correspondente no `PrazosCasoTab` (fica mais simples).

### Parte 2: Propagar `processo_oab_id` do contexto do caso

No `ProcessoOABDetalhes.tsx`, ao disparar o evento `deadline-created`, incluir o `processoOabId` no detalhe. Mais importante: como o `CreateDeadlineDialog` busca `processo_oab_id` do protocolo (que pode ser null), precisamos de um fallback.

**Opção mais robusta**: quando o drawer do processo está aberto e o usuário cria um deadline dentro dele (via protocolo/etapa), o deadline DEVE receber o `processo_oab_id` do caso aberto. Mas o `CreateDeadlineDialog` não tem acesso a esse contexto.

A solução mais simples: usar um `window` custom event com o `processo_oab_id` do caso atual, e no `CreateDeadlineDialog`, escutar esse contexto como fallback.

**Na prática, alteração mínima:**

1. **`ProcessoOABDetalhes.tsx`**: Setar `window.__currentProcessoOabId = processo.id` quando o drawer abre, limpar quando fecha.
2. **`CreateDeadlineDialog.tsx`**: No insert, usar `processo_oab_id: protocolo.processo_oab_id || (window as any).__currentProcessoOabId || null`.
3. **`PrazosCasoTab.tsx`**: Simplificar removendo `refreshKey` prop (o `key` no pai faz o trabalho).

### Alterações por arquivo

| Arquivo | Mudança |
|---------|---------|
| `ProcessoOABDetalhes.tsx` | `key={prazosRefreshKey}` no PrazosCasoTab; setar `window.__currentProcessoOabId` ao abrir/fechar drawer |
| `CreateDeadlineDialog.tsx` | Fallback para `window.__currentProcessoOabId` quando protocolo não tem `processo_oab_id` |
| `PrazosCasoTab.tsx` | Remover prop `refreshKey` e useEffect associado (o key no pai já resolve) |

