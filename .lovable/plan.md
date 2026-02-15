

## Captura de Publicacoes via PJe Comunicacoes (DJEN)

### Contexto

O sistema ja possui a infraestrutura para acessar o portal `comunica.pje.jus.br` (DJEN) - isso esta implementado nas Edge Functions `buscar-andamentos-pje` e `buscar-processos-lote`. A ideia e reutilizar essa logica para alimentar a tabela `publicacoes` no formato padrao do modulo Publicacoes.

### O que sera feito

#### 1. Novo modo `pje_scraper` na Edge Function `buscar-publicacoes-pje`

Adicionar um novo modo na Edge Function existente que:
- Recebe `tenant_id` e opcionalmente `monitoramento_id`
- Busca os processos do tenant na tabela `processos_oab` (que ja tem `numero_cnj` e `tribunal`)
- Para cada processo, consulta `comunica.pje.jus.br/consulta` com os parametros de tribunal, numero do processo e range de datas
- Faz parse do HTML retornado (reutilizando a logica do `buscar-processos-lote` que ja funciona)
- Mapeia as intimacoes encontradas para o formato da tabela `publicacoes` (data_disponibilizacao, tipo, numero_processo, diario_sigla, conteudo_completo, etc.)
- Insere via upsert para evitar duplicatas

#### 2. Botao "Buscar via DJEN" no drawer de Publicacoes

No componente `PublicacoesDrawer.tsx`, adicionar um botao que dispara a busca manual via PJe Comunicacoes:
- Botao com icone de refresh ao lado dos filtros
- Ao clicar, chama a Edge Function no modo `pje_scraper`
- Mostra toast com resultado (X publicacoes encontradas/inseridas)
- Recarrega a lista automaticamente

#### 3. Parsing do HTML do PJe Comunicacoes

Reutilizar e adaptar o parser de `buscar-processos-lote` (funcao `parseMovimentacoesPje`) que ja extrai:
- Sequencia e tipo (Intimacao, Citacao, etc.)
- Orgao julgador
- Data de disponibilizacao
- Texto/conteudo da intimacao
- Partes envolvidas
- Prazo processual

### Detalhes tecnicos

**Arquivos a editar:**
- `supabase/functions/buscar-publicacoes-pje/index.ts` - adicionar modo `pje_scraper` com parser HTML do comunica.pje.jus.br
- `src/components/Publicacoes/PublicacoesDrawer.tsx` - adicionar botao de busca manual

**Fluxo:**

```text
Usuario clica "Buscar DJEN"
        |
        v
Edge Function (mode: pje_scraper)
        |
        v
Busca processos_oab do tenant (numero_cnj + tribunal)
        |
        v
Para cada processo: GET comunica.pje.jus.br/consulta?siglaTribunal=X&numeroProcesso=Y&datas
        |
        v
Parse HTML -> extrai intimacoes
        |
        v
Mapeia para formato publicacoes (tipo, conteudo, orgao, etc.)
        |
        v
UPSERT na tabela publicacoes (evita duplicatas)
        |
        v
Retorna contagem -> Toast no frontend
```

**Tribunais suportados:** Todos os mapeados no TRIBUNAL_MAP ja existente (TJPR, TJSP, TJRJ, TJMG, etc.)

**Range de datas:** Ultimos 30 dias por padrao (configuravel)

**Deduplicacao:** Usa o unique constraint existente `(tenant_id, monitoramento_id, numero_processo, data_disponibilizacao, diario_sigla)` com `ignoreDuplicates: true`
