

# Fix: search_key para processo apartado na API Judit

## Problema
O search_key está sendo construído como `20_digitos_cnj + digitos_sufixo` = `2372688762025826000050000` (25 dígitos). A API Judit rejeita com `CNJ is not valid` porque espera um formato válido.

## Solução
Para apartado, enviar o search_key como `numeroLimpo + "/" + sufixoLimpo` (ex: `23726887620258260000/50000`) em vez de concatenar apenas dígitos.

## Alteração

### `supabase/functions/judit-buscar-processo-cnj/index.ts` (linhas 30-36)

Mudar a construção do searchKey:

```typescript
// Antes (errado):
searchKey = numeroLimpo + sufixoLimpo;

// Depois (correto):
searchKey = numeroLimpo + '/' + sufixoLimpo;
```

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/judit-buscar-processo-cnj/index.ts` | Incluir `/` entre CNJ e sufixo no searchKey |

