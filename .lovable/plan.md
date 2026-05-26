## Causa raiz

Na print, "**OABs a migrar (0/0) — Nenhuma OAB**". O botão "Executar lote" exige `oabsSelecionadas.size > 0`, então fica desabilitado.

O painel busca OABs com `supabase.from('oabs_cadastradas').select(...).eq('tenant_id', X)` no client. Em `/super-admin`, o usuário super-admin **não é membro do tenant SOLVENZA**, e a RLS de `oabs_cadastradas` exige `has_role_in_tenant()` — por isso o SELECT volta vazio (silenciosamente). Funciona em Controladoria porque lá o usuário pertence ao tenant.

Sobre "auditoria": dry-run e execução já retornam dados úteis, mas a UI atual mostra muito pouco (só o número do CNJ + badge). O par **tracking antigo → tracking novo** não aparece em nenhuma lista; também não há exportação.

## Correção

### 1. Carregar OABs com privilégio de service-role
Adicionar um modo `listOabs` à Edge Function `judit-rebind-credencial-lote` (já tem service-role). Retorna `[{id, nome_advogado, oab_numero, oab_uf}]` para o `tenantId`.

No `RebindCredencialJuditPanel`: substituir o SELECT direto por chamada ao hook `useRebindCredencialJudit` em modo `listOabs`. Funciona tanto em Controladoria (já era service-role na Edge) quanto em Super-admin.

### 2. Auditoria visível e exportável
- **Dry-run:** adicionar coluna **"tracking antigo"** (fonte mono, truncada com tooltip) ao lado do CNJ; manter as badges de "compartilhado" e "pausa antigo / mantém antigo".
- **Execução:** ampliar `runResult.results` na UI para mostrar `numero_cnj | tracking_antigo | → | tracking_novo | badge(status)` + badge "pausado" quando aplicável.
- **Botão "Exportar auditoria (CSV)":** aparece quando há `dryResult` ou `runResult`. Gera CSV com colunas: `numero_cnj, tracking_antigo, tracking_novo, antigo_pausado, compartilhado_fora_filtro, status, erro`. Une dados de dry-run e da última execução (run sobrescreve dry para os CNJs em comum).
- **Persistência server-side:** já temos `judit_migracao_attachments` com `motivo='rebind_credencial'`, `customer_key`, `tracking_id_antigo`, `tracking_id_novo`. Aproveitar para um botão **"Carregar histórico desta credencial"** que lê desse table filtrado por `tenant_id + motivo + customer_key`, garantindo que o usuário possa auditar a qualquer momento (não só logo após rodar).

### 3. Hook
`useRebindCredencialJudit.invoke(params, mode)` ganha o modo `'listOabs'`. Para esse modo, basta `tenantId` no body; retorna `{ oabs: [...] }`.

Nenhuma migration de schema. Sem alteração de RLS. Sem alteração de payload das chamadas existentes (count/dry/run).

## Arquivos afetados

- `supabase/functions/judit-rebind-credencial-lote/index.ts` — novo modo `listOabs` + um modo `history` (lê `judit_migracao_attachments`).
- `src/hooks/useRebindCredencialJudit.ts` — tipos do `mode` ampliados; helper para `listOabs` e `history`.
- `src/components/Controladoria/RebindCredencialJuditPanel.tsx`:
  - troca SELECT direto por chamada ao edge `listOabs`;
  - melhora tabelas de dry-run e execução com tracking antigo/novo;
  - botão "Exportar auditoria CSV";
  - botão "Carregar histórico" + lista com paginação simples.

## Impacto

- **Usuário final (super-admin):** a aba "Recriar c/ credencial" passa a listar as OABs do tenant (Alan, Will, João etc.), com seleção padrão "todos exceto João" funcionando. O botão **Executar lote** habilita. Após dry-run/execução, vê a auditoria detalhada (tracking antigo → novo, pausa) e pode exportar CSV. Histórico das migrações anteriores também consultável pela própria tela.
- **Usuário final (tenant — Controladoria):** mesmo comportamento, agora com auditoria mais rica e CSV. Não há regressão.
- **Dados:** nenhum schema novo. Edge Function passa a fazer SELECTs adicionais (oabs_cadastradas, judit_migracao_attachments) com service-role — uso pontual, sem impacto de performance.
- **Riscos colaterais:** baixos. A Edge Function continua exigindo `tenantId`; modos novos são read-only.
- **Quem é afetado:** super-admins (correção do bloqueio + auditoria) e admins/advogados em Controladoria (só ganho de auditoria/CSV).

## Validação

1. `/super-admin` → aba **Recriar c/ credencial** → selecionar **SOLVENZA** → lista de OABs aparece com checagens; João desmarcado por padrão.
2. **Contar** → mostra elegíveis ≈ 86 (TJPR Alan+Will).
3. **Dry-run** → tabela lista CNJ + tracking_antigo + badge "pausa antigo / mantém antigo" + "compartilhado" quando aplicável.
4. **Exportar auditoria CSV** → arquivo abre com colunas `numero_cnj, tracking_antigo, tracking_novo, antigo_pausado, compartilhado_fora_filtro, status, erro` (pós dry-run só tem antigo; pós run vem o novo também).
5. **Executar lote (5)** → results mostra `antigo → novo` com badge pausado. Tabela `judit_migracao_attachments` recebe linhas com `motivo='rebind_credencial'`, `customer_key='alangeral'`.
6. **Carregar histórico** → lista as execuções anteriores desta credencial para o tenant.
7. Em conta tenant: Controladoria → Migração de Anexos → "Recriar com credencial" → mesmo fluxo, sem regressão.
