
# Corrigir Importação de Andamentos para Processos em Segredo de Justiça

## Problema Identificado

O processo `0007772-80.2025.8.16.0013` está em **segredo de justiça** e a API Judit não retorna o histórico completo de andamentos (array `steps` vazio). Porém, a API **retorna informações no campo `last_step`** que não estão sendo processadas.

## Causa Raiz

Na Edge Function `judit-buscar-detalhes-processo`, a linha 268 busca andamentos apenas de:

```javascript
const steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];
```

Quando `steps` está vazio `[]`, o fallback não funciona porque JavaScript considera um array vazio como truthy. O campo `last_step` contém dados úteis mas não está sendo processado.

## Solução

Modificar a Edge Function para:
1. Verificar se o array `steps` está **realmente vazio** (length === 0)
2. Usar `last_step` como fallback para criar ao menos um andamento
3. Manter compatibilidade com processos que já têm steps completos

---

## Alterações Técnicas

### Arquivo: `supabase/functions/judit-buscar-detalhes-processo/index.ts`

**De (linha 268):**
```typescript
const steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];
```

**Para:**
```typescript
// Buscar steps do responseData
let steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];

// NOVO: Se steps está vazio mas existe last_step, usar como fallback
// Isso é comum em processos com segredo de justiça
if (steps.length === 0 && responseData?.last_step) {
  console.log('[Judit Detalhes] Array steps vazio, usando last_step como fallback');
  steps = [responseData.last_step];
}
```

**Mapear campos do last_step (linha ~301):**
```typescript
// Atualizar extração de dados para suportar campos do last_step
const dataMovimentacao = step.step_date || step.date || step.data || step.data_movimentacao;
const descricao = step.content || step.description || step.descricao || '';
const tipoMovimentacao = step.step_type || step.type || step.tipo || null;
```

---

## Fluxo Após Correção

```text
Processo em Segredo de Justiça importado
              |
              v
API Judit retorna steps: [] mas last_step preenchido
              |
              v
Código verifica: steps.length === 0 ?
              |
         [SIM]|[NAO]
              |    \
              v     > Usa steps normal
Usa last_step como fallback
              |
              v
Insere 1 andamento com dados do last_step
              |
              v
Usuario vê ao menos o último andamento do processo
```

---

## Resultado Esperado

1. Processos em segredo de justiça terão ao menos o **último andamento** registrado
2. Processos normais continuarão funcionando com histórico completo
3. O log indicará quando o fallback foi utilizado para debugging
4. A correção é retrocompatível com dados já importados

---

## Observação

Esta é uma limitação da API Judit para processos sigilosos. O sistema não terá acesso ao histórico completo, apenas às informações disponíveis publicamente (geralmente o último andamento).
