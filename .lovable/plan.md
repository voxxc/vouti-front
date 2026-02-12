

## Integrar Webhook do n8n (TJPR Scraper) na Edge Function de Publicacoes

### Resumo

O workflow de scraping do PJe ja esta pronto no n8n e disponivel via webhook. Agora precisamos conectar a Edge Function `buscar-publicacoes-pje` a esse webhook para buscar publicacoes reais e popular a tabela `publicacoes` do tenant `/demorais`.

### O que sera feito

Adicionar um novo modo `n8n_scraper` na Edge Function existente que:

1. Recebe parametros de busca (tribunal, OAB, periodo)
2. Chama o webhook do n8n (`https://voutibot.app.n8n.cloud/webhook/tjpr-scraper`)
3. Recebe os dados estruturados (array de publicacoes)
4. Mapeia para o formato da tabela `publicacoes`
5. Insere no banco via upsert (evitando duplicatas)

### Fluxo

```text
Frontend/CRON
    |
    v
Edge Function (mode: n8n_scraper)
    |
    v
POST https://voutibot.app.n8n.cloud/webhook/tjpr-scraper
    |  Body: { siglaTribunal, numeroOab, ufOab, dataInicio, dataFim }
    v
n8n Workflow (scraping comunica.pje.jus.br)
    |
    v
JSON Response: { success, data: [{ numeroProcesso, dataPublicacao, tribunal, descricao }] }
    |
    v
Edge Function mapeia e faz upsert na tabela publicacoes
```

### Alteracoes

| Arquivo | O que muda |
|---|---|
| `supabase/functions/buscar-publicacoes-pje/index.ts` | Adiciona modo `n8n_scraper` com chamada ao webhook e mapeamento dos dados |

### Detalhes tecnicos

**Modo `n8n_scraper` - Parametros de entrada:**

```text
{
  "mode": "n8n_scraper",
  "tribunal": "TJPR",           // default: TJPR
  "oab_numero": "111056",       // obrigatorio
  "oab_uf": "PR",               // obrigatorio
  "data_inicio": "2025-03-01",  // default: 90 dias atras
  "data_fim": "2026-02-12",     // default: hoje
  "tenant_id": "uuid",          // obrigatorio para inserir
  "monitoramento_id": "uuid"    // opcional
}
```

**Mapeamento de campos n8n -> tabela publicacoes:**

| n8n response | Campo publicacoes |
|---|---|
| `numeroProcesso` | `numero_processo` |
| `dataPublicacao` | `data_disponibilizacao`, `data_publicacao` |
| `tribunal` | `diario_sigla` |
| `descricao` | `conteudo_completo` |
| (classificado pela descricao) | `tipo` (Intimacao, Citacao, Despacho, etc) |
| fixo | `diario_nome` = "PJe Comunicacoes - TJPR" |
| fixo | `link_acesso` = URL do comunica.pje.jus.br |
| fixo | `status` = "nao_tratada" |

**Tambem sera adicionado um modo `n8n_test`** para diagnostico, que chama o webhook e retorna o JSON bruto sem inserir no banco.

**Limpeza:** O modo `scrape_test` (Firecrawl) sera removido por estar obsoleto.

### Plano de teste apos implementacao

1. Deploy da Edge Function
2. Chamar com `mode: "n8n_test"` para verificar se o webhook responde
3. Chamar com `mode: "n8n_scraper"` com tenant_id do /demorais para popular dados reais
4. Verificar se as publicacoes aparecem no drawer de Publicacoes

### Evolucao futura

- Integrar o modo `n8n_scraper` no fluxo automatico diario (cron das 8h) junto com o DataJud
- Criar webhooks no n8n para outros tribunais alem do TJPR
- Adicionar autenticacao no webhook (header API key) para seguranca

