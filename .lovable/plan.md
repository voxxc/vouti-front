

## Substituir Firecrawl pela API Publica do DataJud (CNJ) para buscar publicacoes reais

### Contexto

O Firecrawl nao consegue renderizar o site comunica.pje.jus.br (SPA Angular). A API de comunicacoes processuais do CNJ requer credenciais de tribunal. Porem, existe a **API Publica do DataJud**, que retorna metadados reais de processos judiciais via Elasticsearch, incluindo movimentacoes que contem intimacoes e publicacoes.

### Como funciona a API DataJud

- **Endpoint**: `https://api-publica.datajud.cnj.jus.br/api_publica_{tribunal}/_search`
- **Autenticacao**: Header `Authorization: APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==` (chave publica oficial do CNJ)
- **Metodo**: POST com body Elasticsearch
- **Dados retornados**: numero CNJ, classe processual, assuntos, orgao julgador, movimentacoes (andamentos), data de ajuizamento, grau, tribunal

### O que muda

A Edge Function `buscar-publicacoes-pje` sera reescrita para:

1. **Buscar via API DataJud** em vez de Firecrawl
2. Para cada monitoramento ativo, construir query Elasticsearch filtrando por movimentacoes recentes do tribunal
3. Extrair dados reais: numero do processo, orgao julgador, tipo de movimentacao, conteudo do andamento, data
4. Inserir na tabela `publicacoes` com dados verdadeiros

### Fluxo de consulta por monitoramento

Para cada `publicacoes_monitoramentos` ativo:
1. Identificar os tribunais monitorados (ex: TJPR -> `tjpr`)
2. Montar query Elasticsearch buscando processos por numero de OAB (se suportado) ou por numero CNJ
3. Filtrar movimentacoes com data >= `data_inicio_monitoramento`
4. Mapear movimentacoes para registros na tabela `publicacoes`

### Teste imediato

Apos deploy, chamar a funcao com `mode: "api_test"` passando o numero do processo `0004010-95.2026.8.16.0021` no tribunal TJPR para verificar se a API retorna dados reais. Se retornar, inserir automaticamente no monitoramento do `/demorais`.

### Limitacao importante

A API DataJud retorna **metadados de processos** (movimentacoes, partes, orgao julgador), nao exatamente o texto integral do Diario de Justica. Os dados sao reais mas o campo `conteudo_completo` tera as movimentacoes em vez do texto do diario oficial. Isso ainda e util para monitoramento de andamentos processuais.

### Resumo tecnico das alteracoes

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/buscar-publicacoes-pje/index.ts` | Reescrever para usar API DataJud em vez de Firecrawl. Adicionar modo `api_test` para diagnostico. Manter modos `seed` e `scrape_test` existentes. |

### Passo a passo da implementacao

1. Adicionar constante da API key publica do DataJud
2. Criar funcao `buscarViaDataJud(tribunal, numeroProcesso)` que faz POST ao endpoint Elasticsearch
3. Criar funcao `buscarMovimentacoesPorOab(tribunal, oabNumero)` - tentar busca por OAB (pode nao ser suportada, nesse caso fallback para CNJ)
4. Adicionar modo `api_test` que retorna o JSON bruto da API para diagnostico
5. Substituir o fluxo principal (modo manual/cron) para usar DataJud em vez de Firecrawl
6. Deployar e testar com o processo `0004010-95.2026.8.16.0021` no TJPR
7. Se funcionar, inserir no monitoramento do `/demorais` com dados reais

