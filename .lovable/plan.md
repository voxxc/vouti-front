

## Inserir publicacao de teste no tenant /demorais

Como o banco de dados so aceita escrita via Edge Functions ou frontend autenticado, vou modificar a Edge Function `buscar-publicacoes-pje` para aceitar um modo `seed` que insere registros de teste diretamente.

### Abordagem

**Arquivo**: `supabase/functions/buscar-publicacoes-pje/index.ts`

Adicionar um handler para `mode: "seed"` que:
1. Recebe um objeto `record` no body com os dados da publicacao
2. Insere diretamente na tabela `publicacoes` usando service role
3. Retorna o registro inserido

Depois de deploy, chamar a funcao com os dados do processo `0004010-95.2026.8.16.0021` do TJPR para o tenant `demorais` (monitoramento do Alan Claudio Maran, OAB/PR 111.056).

### Dados a inserir

| Campo | Valor |
|---|---|
| tenant_id | d395b3a1-1ea1-4710-bcc1-ff5f6a279750 |
| monitoramento_id | 5dfc8d9a-d9ea-4b1b-966c-6da941ae191b |
| data_disponibilizacao | 2026-02-10 |
| data_publicacao | 2026-02-11 |
| tipo | Intimacao |
| numero_processo | 0004010-95.2026.8.16.0021 |
| diario_sigla | TJPR |
| diario_nome | Diario da Justica do Estado do Parana |
| comarca | Curitiba |
| nome_pesquisado | Alan Claudio Maran |
| status | nao_tratada |
| orgao | 18a Camara Civel - Foro Central de Curitiba |
| conteudo_completo | Texto completo simulado da decisao judicial |

### Arquivos alterados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/buscar-publicacoes-pje/index.ts` | Adicionar handler `mode: "seed"` |

Apos deploy, chamarei a funcao para inserir o registro e voce podera visualizar no drawer Publicacoes do /demorais.
