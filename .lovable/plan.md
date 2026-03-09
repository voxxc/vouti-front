
## Atualização automática da aba Prazos após criação

### Problema
`CreateDeadlineDialog` está em `EtapaModal.tsx`, enquanto `PrazosCasoTab` está em `ProcessoOABDetalhes.tsx`. Não há comunicação entre eles — o prazo é criado mas a lista não atualiza.

### Solução
Usar **Supabase Realtime** para detectar novos prazos automaticamente, seguindo o padrão já adotado no projeto (conforme memória `architecture/event-driven-real-time-standard`).

### Alterações

**`src/components/Controladoria/PrazosCasoTab.tsx`**

1. **Adicionar subscription Realtime** na tabela `deadlines`:
   - Escutar eventos `INSERT` e `UPDATE`
   - Quando detectar mudança, chamar `fetchPrazos()` silenciosamente

```typescript
useEffect(() => {
  const channel = supabase
    .channel(`prazos-caso-${processoOabId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'deadlines'
    }, () => {
      fetchPrazos(); // refresh silencioso
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [processoOabId]);
```

2. **Extrair `fetchPrazos` para `useCallback`** para poder usar no subscription

### Benefícios
- Zero polling (eficiente)
- Atualização instantânea ao criar/editar prazos
- Funciona mesmo se o prazo for criado em outra aba/janela
- Padrão já usado no projeto

### 1 arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `PrazosCasoTab.tsx` | Adicionar subscription Realtime para atualização automática |
