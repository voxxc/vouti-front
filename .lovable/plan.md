
# Plano: Importar CNJ Único em Segundo Plano

## Problema Atual
No modo de importação única, o usuário fica esperando o resultado da busca com um spinner "Importando..." que pode demorar até 60 segundos. Isso trava a interface sem necessidade.

O modo em massa já implementa corretamente o comportamento desejado:
1. Fecha o dialog imediatamente
2. Mostra toast "Importação iniciada"
3. Processa em background
4. Notifica quando concluir

## Solução
Aplicar o mesmo padrão do modo em massa para o modo único.

---

## Alteração no Arquivo

**Arquivo:** `src/components/Controladoria/ImportarProcessoCNJDialog.tsx`

### Função `handleImportar` (linhas 65-116)

**Antes (bloqueante):**
```tsx
setImportando(true);
try {
  const { data, error } = await supabase.functions.invoke(...);
  // ... aguarda resultado
  toast({ title: 'Processo importado' });
} finally {
  setImportando(false);
}
```

**Depois (background):**
```tsx
// 1. Salvar dados necessários antes de fechar
const cnjParaImportar = numeroCnj;

// 2. Limpar estado e fechar dialog imediatamente
setNumeroCnj('');
onOpenChange(false);

// 3. Notificar início
toast({
  title: 'Importação iniciada',
  description: 'Buscando processo em segundo plano...'
});

// 4. Processar em background (sem await no fluxo principal)
supabase.functions.invoke('judit-buscar-processo-cnj', {
  body: { numeroCnj: cnjParaImportar, oabId, tenantId, userId }
}).then(({ data, error }) => {
  if (error || !data?.success) {
    toast({
      title: 'Erro ao importar',
      description: error?.message || data?.error || 'Tente novamente',
      variant: 'destructive'
    });
  } else {
    toast({
      title: 'Processo importado',
      description: data.dadosCompletos === false 
        ? 'Processo em sigilo ou dados indisponíveis'
        : `${data.andamentosInseridos} andamentos registrados`
    });
    onSuccess?.();
  }
}).catch((err) => {
  toast({
    title: 'Erro ao importar',
    description: err.message || 'Falha na conexão',
    variant: 'destructive'
  });
});
```

---

## Resultado Esperado

1. **Usuário clica em "Importar Processo"**
2. **Dialog fecha instantaneamente**
3. **Toast aparece:** "Importação iniciada - Buscando processo em segundo plano..."
4. **Após 30-60 segundos, toast de conclusão:**
   - Sucesso: "Processo importado - X andamentos registrados"
   - Erro: "Erro ao importar - [mensagem]"
5. **Lista de processos é atualizada automaticamente via `onSuccess()`**

---

## Detalhes Técnicos

```text
┌─────────────────────────────────────┬──────────────────────────────────┐
│ Comportamento Atual                 │ Comportamento Novo               │
├─────────────────────────────────────┼──────────────────────────────────┤
│ Dialog fica aberto durante busca    │ Dialog fecha imediatamente       │
│ Spinner "Importando..." por 60s     │ Toast de progresso               │
│ Usuário não pode fazer nada         │ Usuário continua trabalhando     │
│ Resultado aparece no dialog         │ Resultado via toast              │
└─────────────────────────────────────┴──────────────────────────────────┘
```

O botão de importar não precisa mais do estado `importando` para mostrar spinner, pois a ação é instantânea. O estado `importando` pode ser removido completamente.
