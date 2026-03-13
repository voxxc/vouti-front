

# Correção: Busca por nome retorna erro (HTML em vez de JSON)

## Causa raiz
O código usa `https://lawsuits.prod.judit.io` para tudo, mas o endpoint `/responses` (polling) fica em `https://requests.prod.judit.io`. Quando a busca por nome precisa de polling (não retorna dados imediatos), o fetch para `/responses` no domínio errado retorna uma página HTML, causando `SyntaxError: Unexpected token '<'`.

Confirmado nos logs do `judit-webhook-oab` que já usa o domínio correto:
```
GET responses: https://requests.prod.judit.io/responses?request_id=...
```

## Correção

### `supabase/functions/judit-buscar-dados-cadastrais/index.ts`

1. Separar as base URLs:
   - **Criar requests**: `https://lawsuits.prod.judit.io/requests/create` (correto, manter)
   - **Polling responses**: `https://requests.prod.judit.io/responses` (corrigir)

2. Aplicar em todos os pontos de polling:
   - Linha 149: `fetchEntityDetails` polling
   - Linha 276: polling principal

3. Adicionar tratamento seguro de resposta não-JSON no polling (fallback para evitar crash se o endpoint retornar HTML).

### Detalhes técnicos
- Adicionar constante `JUDIT_REQUESTS_BASE = 'https://requests.prod.judit.io'`
- Substituir URLs de polling de `${JUDIT_API_BASE}/responses` para `${JUDIT_REQUESTS_BASE}/responses`
- Envolver `pollResponse.json()` em try/catch para logar o body raw se não for JSON

