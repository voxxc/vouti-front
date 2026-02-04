
# Correção: Timeout na Sincronização de Monitoramentos

## Problema Identificado

A Edge Function `judit-sync-monitorados` está atingindo o **timeout de 60 segundos** porque:

| Métrica | Valor |
|---------|-------|
| Processos monitorados | 95 |
| Processos do Solvenza | 93 (98% do total) |
| Tempo por processo | ~1.2 segundos |
| Tempo total estimado | ~114 segundos |
| Timeout da Edge Function | 60 segundos |

O `shutdown` visível nos logs confirma que a função está sendo encerrada forçadamente.

---

## Solução Proposta: Processamento em Batches Paralelos

Modificar a Edge Function para:

1. **Processar em lotes paralelos** (10 processos por vez)
2. **Limitar por tenant** quando houver muitos processos
3. **Retornar resposta parcial** se atingir timeout

### Mudanças na Edge Function

```typescript
// ANTES: processamento sequencial
for (const processo of processos) {
  // 1 por vez...
  await processarProcesso(processo);
}

// DEPOIS: processamento em batches paralelos
const BATCH_SIZE = 10;
const batches = chunkArray(processos, BATCH_SIZE);

for (const batch of batches) {
  await Promise.all(
    batch.map(processo => processarProcesso(processo))
  );
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/judit-sync-monitorados/index.ts` | Implementar processamento em batches paralelos |

---

## Melhoria Adicional no Frontend

Exibir progresso incremental no SuperAdmin:
- Mostrar quantos processos foram verificados até agora
- Exibir timer de tempo decorrido
- Permitir sincronizar apenas um tenant específico (já existe, mas vamos destacar)

---

## Alternativa: Limitar processos por execução

Se preferir uma solução mais simples, podemos limitar a 30 processos por execução e exigir múltiplas sincronizações para completar todos.

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Timeout após 60s | Completa em ~20-30s |
| Erro de rede no frontend | Resposta JSON com resultados |
| Processos não sincronizados | Todos os processos verificados |
