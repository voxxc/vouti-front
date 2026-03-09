

## Diagnóstico: Por que as publicações não estão sendo puxadas

Investiguei a fundo o fluxo completo. O problema é **fundamental**: o site `comunica.pje.jus.br/consulta?...` é uma **SPA (Single Page Application)** que carrega dados via JavaScript/AJAX. A edge function faz um `fetch` simples dessa URL e recebe o **shell HTML vazio** (sem dados). O parser regex não encontra nada porque os dados nunca estão no HTML inicial.

Além disso, o parâmetro OAB está errado: a função usa `&oab=` mas o site usa `&numeroOab=`.

**Boa notícia**: descobri que existe uma **API JSON real** por trás do site:
- Frontend (SPA, inútil para scraping): `comunica.pje.jus.br/consulta?...`
- **API real**: `comunicaapi.pje.jus.br/api/v1/comunicacoes?...`

Essa API retorna JSON direto, sem precisar renderizar JavaScript.

## Plano de Correção

### Parte 1: Atualizar edge function para usar a API JSON

No arquivo `supabase/functions/buscar-publicacoes-pje/index.ts`, alterar o modo `pje_scraper_oab`:

1. Trocar a URL de `comunica.pje.jus.br/consulta?...` para `comunicaapi.pje.jus.br/api/v1/comunicacoes?...`
2. Corrigir parâmetros: `oab` → `numeroOab`
3. Parsear resposta JSON em vez de HTML
4. Manter o parser HTML como fallback caso a API retorne HTML

### Parte 2: Adicionar modo de teste da API

Adicionar um novo modo `api_test_comunica` que faz uma chamada simples à API e retorna o resultado bruto, para validar que funciona desde a infraestrutura do Supabase.

### Parte 3: Novo parser JSON

Criar função `parsePublicacoesApiJson()` que mapeia a resposta JSON da API para o formato da tabela `publicacoes`. Como não conheço a estrutura exata da resposta, o parser será flexível e logará a resposta completa no primeiro hit para análise.

### Alterações

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/buscar-publicacoes-pje/index.ts` | Trocar URL para API JSON, corrigir params, adicionar parser JSON, adicionar modo teste |

### Lógica do parser JSON (adaptável)

```typescript
// Nova URL
const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacoes`
  + `?siglaTribunal=${sigla}`
  + `&dataDisponibilizacaoInicio=${formatDate(dataInicio)}`
  + `&dataDisponibilizacaoFim=${formatDate(dataFim)}`
  + `&numeroOab=${oabNumero}`
  + `&ufOab=${oabUf}`;

// Fazer request com Accept: application/json
const response = await fetch(url, {
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0...',
  },
});

const contentType = response.headers.get('content-type');
if (contentType?.includes('json')) {
  const json = await response.json();
  // Parse JSON → publicacoes
} else {
  const html = await response.text();
  // Fallback para parser HTML existente
}
```

### Modo teste (para validar antes de processar tudo)

O botão "Buscar DJEN" no drawer de Publicações continuará funcionando igual. Adicionarei um modo `api_test_comunica` para testar a conectividade da API desde o Supabase e ver a resposta real.

### Risco

A API `comunicaapi.pje.jus.br` pode ter geo-blocking (vi um 403 do CloudFront nos meus testes). Porém, as Edge Functions do Supabase rodam em regiões diferentes e **podem** ter acesso. Se não funcionar, o fallback é o **webhook n8n** (modo `n8n_scraper`) que já existe e usa headless browser.

