

## Testar scraping real do comunica.pje.jus.br via Firecrawl

### Objetivo

Implementar e executar um teste diagnostico para verificar se o Firecrawl consegue extrair dados reais do portal PJE antes de inserir qualquer informacao.

### Passo 1 - Adicionar modo `scrape_test` na Edge Function

**Arquivo**: `supabase/functions/buscar-publicacoes-pje/index.ts`

Adicionar handler para `mode === 'scrape_test'`:
- Recebe `url` no body
- Chama Firecrawl com `waitFor: 15000` e `formats: ['markdown']`
- Retorna o markdown bruto sem processar
- Timeout curto, sem inserir nada no banco

### Passo 2 - Deploy e teste

Deployar a funcao e chamar com a URL exata:
```
https://comunica.pje.jus.br/consulta?siglaTribunal=TJPR&dataDisponibilizacaoInicio=2025-03-01&dataDisponibilizacaoFim=2026-02-11&numeroOab=111056&ufOab=pr
```

### Passo 3 - Analisar resultado

- **Se retornar conteudo real**: extrair dados do processo `0004010-95.2026.8.16.0021` e inserir com dados verdadeiros
- **Se retornar pagina em branco**: informar que o Firecrawl nao consegue renderizar esse SPA e buscar alternativa

### Passo 4 - Inserir dados reais (se scraping funcionar)

Usar modo `seed` para inserir o registro com conteudo **real** captado do site.

### Arquivo alterado

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/buscar-publicacoes-pje/index.ts` | Adicionar handler `scrape_test` (poucas linhas) |

### Compromisso

Nenhum dado sera inventado. Se o scraping nao retornar conteudo real, informarei imediatamente.
