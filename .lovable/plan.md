

## Correções Necessárias - judit-sync-monitorados

### Resumo do Problema

A sincronizacao nao funcionou porque:

1. **Edge Function nao deployada**: O arquivo foi modificado mas a versao antiga ainda esta rodando (logs mostram erro `lido` ao inves de `lida`)
2. **Coluna inexistente**: O codigo tenta atualizar `andamentos_nao_lidos` que nao existe no schema
3. **RPC incorreto**: Uso incorreto do `supabase.rpc` dentro de update

### Diagnostico via Logs

```
Logs de 13:27:46Z mostram:
- "Could not find the 'lido' column" <- versao antiga ainda rodando
```

```
Schema da tabela processos_oab:
- NAO possui coluna andamentos_nao_lidos
```

---

### Correcoes a Implementar

#### 1. Remover referencia a coluna inexistente

Linha 265-271 - Remover o bloco que tenta atualizar `andamentos_nao_lidos`:

```typescript
// ANTES (incorreto)
if (processNewCount > 0) {
  results.processos_atualizados++;
  
  // Update unread count
  await supabase
    .from('processos_oab')
    .update({
      andamentos_nao_lidos: supabase.rpc('increment', { x: processNewCount }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', processo.id);
}

// DEPOIS (corrigido)
if (processNewCount > 0) {
  results.processos_atualizados++;
  
  // Apenas atualiza timestamp do processo
  await supabase
    .from('processos_oab')
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq('id', processo.id);
}
```

#### 2. Forcar redeploy da Edge Function

Apos a correcao, fazer deploy manual da Edge Function para garantir que a nova versao seja aplicada.

---

### Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/judit-sync-monitorados/index.ts` | Remover referencia a `andamentos_nao_lidos` e RPC incorreto |

---

### Fluxo Apos Correcao

1. Modificar Edge Function
2. Deploy automatico
3. Super Admin clica em "Sincronizar Agora"
4. Novos andamentos serao inseridos corretamente
5. Processo `0012919-29.2025.8.16.0194` tera andamento do dia 26 visivel

---

### Nota Tecnica

Se for necessario manter o contador de andamentos nao lidos, sera preciso:
- Criar a coluna `andamentos_nao_lidos` via migration
- Ou usar uma query SQL para contar os nao lidos dinamicamente

Por ora, a prioridade e fazer a sincronizacao funcionar.

