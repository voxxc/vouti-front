

## Adicionar botao "Ler Todos" na Central de Andamentos Nao Lidos

### O que muda

Um botao "Ler Todos" sera adicionado no header da Central, ao lado do titulo. Ao clicar, um dialog de confirmacao aparece (pois a acao e irreversivel) e, ao confirmar, todos os andamentos nao lidos de todos os processos sao marcados como lidos de uma vez.

### Alteracoes

**1. `src/hooks/useAndamentosNaoLidosGlobal.ts`**

Adicionar funcao `marcarTodosGlobalComoLidos` que faz um UPDATE em batch:

```typescript
const marcarTodosGlobalComoLidos = async () => {
  const ids = processosRef.current.map(p => p.id);
  if (ids.length === 0) return { error: null };

  const { error } = await supabase
    .from('processos_oab_andamentos')
    .update({ lida: true })
    .in('processo_oab_id', ids)
    .eq('lida', false);

  if (!error) {
    setProcessos([]);
    setTotalNaoLidos(0);
  }

  return { error };
};
```

Retornar `marcarTodosGlobalComoLidos` no return do hook.

**2. `src/components/Controladoria/CentralAndamentosNaoLidos.tsx`**

- Extrair `marcarTodosGlobalComoLidos` do hook
- Adicionar estado `confirmMarkAllGlobal` (boolean) para controlar o dialog
- Adicionar botao no header (ao lado do titulo/badge):

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setConfirmMarkAllGlobal(true)}
  disabled={totalNaoLidos === 0 || loading}
>
  <CheckCheck className="h-4 w-4 mr-1" />
  Ler Todos
</Button>
```

- Adicionar um segundo `AlertDialog` para confirmacao global com texto: "Todos os **{totalNaoLidos}** andamentos nao lidos de **todos os processos** serao marcados como lidos."
- No confirmar, chamar `marcarTodosGlobalComoLidos()` com toast de sucesso/erro

### Resumo

| Arquivo | Mudanca |
|---|---|
| `useAndamentosNaoLidosGlobal.ts` | Nova funcao `marcarTodosGlobalComoLidos` |
| `CentralAndamentosNaoLidos.tsx` | Botao "Ler Todos" + AlertDialog de confirmacao |

