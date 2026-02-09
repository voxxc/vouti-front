

## Correcao: Debounce Nunca Processa (Comparacao de Timestamps)

### Causa Raiz

A comparacao `pending.scheduled_at !== scheduled_at` na funcao `whatsapp-ai-debounce` falha porque:

- O webhook envia: `"2026-02-09T14:18:46.838Z"` (formato ISO do JavaScript)
- O PostgreSQL retorna: `"2026-02-09 14:18:46.838+00"` (formato PostgreSQL)

As strings sao diferentes mesmo representando o mesmo instante. O debounce interpreta isso como "timer resetado" e ignora TODAS as mensagens. Nenhuma resposta da IA e enviada.

### Solucao

**Arquivo: `supabase/functions/whatsapp-ai-debounce/index.ts`** (linha 87)

Trocar a comparacao de string por comparacao de timestamps numericos:

```
// ANTES (nao funciona - formatos diferentes)
if (pending.scheduled_at !== scheduled_at) {

// DEPOIS (compara timestamps reais)
const pendingTime = new Date(pending.scheduled_at).getTime();
const expectedTime = new Date(scheduled_at).getTime();
if (Math.abs(pendingTime - expectedTime) > 1000) {
```

Usar `Math.abs() > 1000` (1 segundo de tolerancia) para cobrir pequenas diferencas de arredondamento de milissegundos.

### Alteracoes

1. **`supabase/functions/whatsapp-ai-debounce/index.ts`** - Linha 87: substituir comparacao de string por comparacao numerica de timestamps com tolerancia de 1 segundo.

Nenhuma outra alteracao necessaria. O webhook, a tabela e a UI estao corretos.

