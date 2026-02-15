

## Busca DJEN Recorrente por OAB Cadastrada

### O que sera feito

Criar uma busca automatica diaria no DJEN (comunica.pje.jus.br) usando os dados de OAB/Nome cadastrados em Extras > Publicacoes. O sistema consultara automaticamente todo dia pela manha e inserira novas publicacoes encontradas.

### Mudancas

#### 1. Novo modo `pje_scraper_oab` na Edge Function `buscar-publicacoes-pje`

Adicionar um modo que:
- Busca todos os monitoramentos ativos da tabela `publicacoes_monitoramentos`
- Para cada monitoramento, consulta `comunica.pje.jus.br` usando o **nome** e/ou **OAB** cadastrados
- Consulta apenas os tribunais selecionados na abrangencia do monitoramento (campo `tribunais_monitorados`)
- Faz parse do HTML e insere na tabela `publicacoes` vinculando ao `monitoramento_id`
- Range de datas: ultimos 5 dias (para capturar publicacoes recentes sem sobrecarregar)

A URL do DJEN aceita parametros como:
```text
https://comunica.pje.jus.br/consulta?siglaTribunal=TJPR&nomeAdvogado=ALAN+CLAUDIO+MARAN&oab=111056&ufOab=PR&dataDisponibilizacaoInicio=2026-02-10&dataDisponibilizacaoFim=2026-02-15
```

#### 2. Cron Job diario (8h BRT / 11h UTC)

Criar um cron via `pg_cron` + `pg_net` que chama a Edge Function no modo `pje_scraper_oab` todo dia as 8h (horario de Brasilia). Isso ja segue o padrao do sistema (memoria: polling automatico as 8h BRT).

#### 3. Botao manual "Buscar DJEN (OAB)" no PublicacoesDrawer

Alem do botao DJEN existente (que busca por processos), adicionar opcao de buscar por OAB tambem, para testes manuais.

### Detalhes tecnicos

**Arquivos a editar:**
- `supabase/functions/buscar-publicacoes-pje/index.ts` - novo modo `pje_scraper_oab`
- `src/components/Publicacoes/PublicacoesDrawer.tsx` - ajustar botao para usar modo OAB

**SQL a executar (cron job):**
- Habilitar extensoes `pg_cron` e `pg_net` (se nao estiverem ativas)
- Criar schedule diario chamando a Edge Function

**Fluxo automatico:**

```text
Cron 8h BRT (11:00 UTC)
        |
        v
Edge Function (mode: pje_scraper_oab)
        |
        v
Busca publicacoes_monitoramentos com status = 'ativo'
        |
        v
Para cada monitoramento:
  - Extrai tribunais da abrangencia (campo tribunais_monitorados)
  - Para cada tribunal sigla (ex: TJPR, TJSP):
    GET comunica.pje.jus.br/consulta?siglaTribunal=X&nomeAdvogado=Y&oab=Z&ufOab=W
        |
        v
Parse HTML -> extrai publicacoes
        |
        v
UPSERT na tabela publicacoes (com monitoramento_id, ignoreDuplicates)
        |
        v
Log resultado por monitoramento
```

**Limitacoes e cuidados:**
- Cada monitoramento pode ter dezenas de tribunais; sera processado em batches de 3 com delay de 1s entre batches
- Timeout da Edge Function: 60s. Se houver muitos tribunais, processara os primeiros e logara quantos ficaram pendentes
- O cron roda sem autenticacao de usuario (usa service_role_key internamente)
- Deduplicacao via unique constraint existente na tabela `publicacoes`
