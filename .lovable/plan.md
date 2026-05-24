## Operação AB2 — Discrepância "Banco de IDs" vs Painel (Solvenza)

### Causa raiz

São **duas fontes de dados diferentes** sendo comparadas, e ainda há um teto de leitura no dialog.

| O quê | Fonte | Solvenza hoje |
|---|---|---|
| Painel "Migração de Anexos" / "ativos" | `processos_oab WHERE monitoramento_ativo=true AND tracking_id IS NOT NULL` (1 linha por processo) | **334 linhas** |
| Mesma consulta, deduplicada por `numero_cnj` | idem, `DISTINCT numero_cnj` | **311 CNJs únicos** |
| Mesma consulta, deduplicada por `tracking_id` | idem, `DISTINCT tracking_id` | **311 trackings únicos** |
| Aba "Trackings ON" do Banco de IDs | `tenant_banco_ids` tipo `tracking` agregado por `referencia_id` (processo_id) | mostra ~328 mas limitado |

O que cria a diferença:

1. **Fonte distinta.** O Banco de IDs reconstrói trackings a partir da tabela de auditoria `tenant_banco_ids` (linhas tipo `tracking` / `tracking_desativado`). O painel lê do estado vivo em `processos_oab`. Auditoria e estado não estão obrigados a ter cardinalidade igual — trackings antigos podem nunca ter gravado evento, e eventos órfãos podem existir sem `processos_oab` correspondente.
2. **Deduplicação implícita.** O dialog agrupa por `processo_id` (1 entrada por processo). O painel conta linhas: o mesmo CNJ aparece **uma vez por OAB** que o referencia. Solvenza tem 334 linhas mas só 311 CNJs distintos → as 23 sobras são processos compartilhados entre 2+ OABs do escritório.
3. **`hardCap: 200` no fetch.** Em `TenantBancoIdsDialog.tsx` linha 108, o carregamento de `tenant_banco_ids` está limitado a 200 linhas. Solvenza tem **360 linhas tipo `tracking`** + 15 `tracking_desativado` + milhares de outros tipos. O cap trunca a leitura, então a aba nunca consegue ver todos os trackings reais.

Resumindo: nem o número do painel (334, com duplicatas por OAB) nem o do Banco de IDs (truncado pelo cap) representam fielmente "quantos trackings ativos existem na Judit". O número correto, de processos únicos sendo monitorados, é **311**.

### Correção proposta

1. **Remover o `hardCap: 200`** em `TenantBancoIdsDialog.tsx` (linha 108). Trocar por leitura completa paginada (já temos `fetchAllPaginated` sem cap).
2. **Trocar a fonte das abas Trackings ON/OFF** para `processos_oab` + `cnpjs_cadastrados` (mesma fonte do painel de migração), mantendo `tenant_banco_ids` apenas para Requests CNJ, OABs e Atividade. Assim o número bate com o painel e com a Judit.
3. **Exibir três contadores** no header de cada aba: `linhas`, `CNJs únicos`, `trackings únicos`. Isso elimina a ambiguidade visual de duplicatas por OAB.
4. **Tooltip explicativo** no contador "Trackings ON" do cartão do tenant esclarecendo a regra de contagem (linha vs CNJ único).

### Arquivos afetados

- `src/components/SuperAdmin/TenantBancoIdsDialog.tsx` — remover hardCap, trocar fonte de Trackings ON/OFF, header com 3 contadores.
- `src/components/SuperAdmin/TenantCard.tsx` (ou onde sai a label "Trackings ON: N") — tooltip explicativo.
- Sem migrations. Sem mudança em Edge Functions.

### Impacto

1. **Usuário final (você no Super-Admin):** o Banco de IDs do Solvenza passará a mostrar 311 trackings únicos (e 334 vínculos OAB↔processo), batendo com o painel de migração e com o relatório da Judit (359 — diferença de 48 ficam para a Operação "órfãos"). Fim da sensação de "número não fecha".
2. **Dados:** nenhuma alteração de schema, RLS ou storage. Apenas leitura. Performance: leitura completa de `tenant_banco_ids` para Solvenza são 15.375 linhas → paginação de 1.000 por vez resolve sem travar; impacto < 2s.
3. **Riscos colaterais:** baixíssimos — mudança isolada no dialog de Super-Admin, não afeta CRM nem nenhum tenant. Risco maior é abrir o dialog ficar 1–2s mais lento por carregar tudo; se incomodar, dá pra adiar Requests/OABs até clicar na aba.
4. **Quem é afetado:** apenas o super-admin (Vouti). Nenhum cliente vê esse dialog.

### Validação

- Abrir Banco de IDs do Solvenza → aba Trackings ON deve mostrar **311 únicos / 334 linhas**, mesmo número do painel de Migração de Anexos.
- Comparar com `SELECT COUNT(*) FROM processos_oab WHERE tenant_id='…solvenza…' AND monitoramento_ativo=true AND tracking_id IS NOT NULL` (deve dar 334).
- Conferir que Daniel Pereira de Morais (2 ativos) continua exibindo "2".
- Após validar, partir para a **Operação Órfãos**: cruzar `tracking_id`s do Vouti com os 359 da planilha Judit para identificar os 48 trackings sem dono em nosso banco.