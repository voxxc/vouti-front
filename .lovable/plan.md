## Causa raiz

No tenant SOLVENZA, os processos do TJPR (CNJ `*.8.16.*`) monitorados na Judit precisam ser **repassados para a credencial `alangeral`**, mas apenas os que estão nas abas OAB de **Alan** e **Willian**. Os da aba do João ficam intocados.

Mapa atual (linhas `processos_oab` ativas, com `tracking_id`, padrão `%.8.16.%`):

| Aba OAB | Linhas 8.16 ativas |
|---|---|
| Willian Andriola (92124/PR) | 54 |
| Alan Claudio Maran (111056/PR) | 33 |
| **Total elegível** | **87 linhas → 86 CNJs únicos** |
| João Carlos (52803/PR) | excluído |

> Obs.: 1 CNJ aparece nas duas abas (Alan + Willian) — conta como 1 tracking só.

A função existente `judit-migrar-trackings-attachments` não permite escolher credencial nem filtrar por OAB/tribunal.

## Correção

### 1. Nova Edge Function `judit-rebind-credencial-lote`

**Body:**
```ts
{
  tenantId: string,
  customerKey: string,         // 'alangeral'
  cnjPattern: string,          // '%.8.16.%'
  oabIds: string[],            // [willOabId, alanOabId]
  batchSize?: number,          // default 10, max 50
  dryRun?: boolean,
}
```

**Lógica (agrupa por `numero_cnj` para não duplicar tracking):**
1. Seleciona CNJs em `processos_oab` com filtros: `tenant_id`, `monitoramento_ativo=true`, `tracking_id IS NOT NULL`, `numero_cnj ILIKE cnjPattern`, `oab_id = ANY(oabIds)`.
2. Para cada CNJ do lote (linha-âncora):
   - `POST tracking` Judit com `credential.customer_key='alangeral'`, `with_attachments=true`, `recurrence=1`.
   - `POST tracking/{antigo}/pause` (best-effort).
   - `UPDATE processos_oab` **só nas linhas dos `oabIds` informados** com o mesmo `numero_cnj` → novo `tracking_id`, `judit_customer_key='alangeral'`, `with_attachments=true`.
   - `INSERT` em `judit_migracao_attachments` com `motivo='rebind_credencial'`, `customer_key='alangeral'`.

> Importante: se um CNJ também existir na aba do João, **a linha do João não é tocada** — ela mantém o tracking antigo (que será pausado!). Resolução: o `UPDATE` ignora essa linha e ela passa a apontar para um tracking pausado. Para evitar isso, antes do `pause` verificamos se o `tracking_id` antigo é usado por alguma linha **fora** dos `oabIds`. Se sim, **não pausamos** o antigo (só criamos o novo) — assim a aba do João continua recebendo updates.

### 2. UI no SuperAdmin (Controladoria → Migração Judit)

Card "Recriar tracking com credencial":

- Select **Credencial** (default `alangeral — *`).
- Select **Padrão CNJ** (default `%.8.16.%`, presets: TJPR/TJSP/TJMG/TJRO/TJSC/TJTO + custom).
- Multiselect **OABs a migrar** (lista `oabs_cadastradas` do tenant) — default já marcado: **Willian + Alan**, João desmarcado.
- Slider **Tamanho do lote** (5/10/25/50, default 10).
- **Contar afetados** → mostra `cnjs_elegiveis / linhas / com_outras_oabs_fora_filtro`.
- **Dry-run** → lista CNJs do próximo lote com flag "antigo será pausado? sim/não (compartilhado com João)".
- **Executar lote** → toast `migrados/erros`.
- Histórico em tabela.

### 3. Migração SQL

```sql
ALTER TABLE judit_migracao_attachments
  ADD COLUMN IF NOT EXISTS customer_key text,
  ADD COLUMN IF NOT EXISTS motivo text DEFAULT 'migracao_anexos';
```

## Arquivos afetados

- **Novo:** `supabase/functions/judit-rebind-credencial-lote/index.ts`
- **Novo:** `src/components/Controladoria/RebindCredencialJuditDialog.tsx`
- **Novo:** `src/hooks/useRebindCredencialJudit.ts`
- **Editado:** painel Judit em Controladoria (botão de abertura).
- **Migração:** colunas em `judit_migracao_attachments`.

## Impacto

**Usuário final (você/admin):**
- Novo botão "Recriar tracking com credencial" no painel Judit da Controladoria.
- Fluxo seguro: contar → dry-run → executar lote a lote (5/10/25/50).
- Histórico audita CNJ, credencial e se o antigo foi pausado.

**Dados:**
- **86 CNJs** ganham tracking novo com `customer_key=alangeral, with_attachments=true`.
- 87 linhas `processos_oab` (Alan + Will) atualizadas (`tracking_id`, `judit_customer_key`).
- Linhas da aba do João **não são tocadas** mesmo em CNJs compartilhados — e o tracking antigo do João **não é pausado** quando há compartilhamento.
- Auditoria por CNJ em `judit_migracao_attachments`.

**Performance/consumo Judit:**
- ~2 chamadas por CNJ. 86 CNJs ≈ 172 requests Judit → 9 lotes de 10 (~10s cada).
- Trackings pausados (não-compartilhados) param de consumir; novos consomem 1 recurrence/dia.
- Em CNJs compartilhados com João: temporariamente haverá **2 trackings ativos** (antigo do João + novo do Alan/Will). É o comportamento desejado para não quebrar a aba do João.

**Riscos colaterais:**
- Se `alangeral` não tiver permissão num 8.16 específico, o novo tracking é criado mas a próxima execução pode falhar — registrado em `judit_api_logs` para reprocessar.
- Se `pause` falhar (rede), antigo continua ativo → cobrança dupla; visível no histórico (`antigo_pausado=false`) e reexecutável.
- Linhas das abas de Alan/Will que já apontavam para o mesmo tracking antigo do João: o `UPDATE` move só Alan/Will para o novo tracking; João fica no antigo (mantido ativo). Sem perda de dados.

**Quem é afetado:**
- Somente tenant SOLVENZA.
- Apenas processos das OABs marcadas (Alan + Will). João não recebe nenhuma alteração.

## Validação

1. Abrir dialog → marcar Alan e Will, padrão `%.8.16.%`, credencial `alangeral` → **Contar** deve retornar **86 CNJs elegíveis (87 linhas)**.
2. **Dry-run** de 5 → conferir lista; nenhum CNJ deve ter `oab_id` do João como único.
3. Executar 1 lote de 5 → histórico mostra `migrado=5`, `customer_key=alangeral`, `antigo_pausado` correto (true para exclusivos, false para compartilhados).
4. Abrir 1 CNJ migrado e confirmar `judit_customer_key=alangeral` + novo `tracking_id` na linha do Alan/Will, e a linha do João (se houver) mantém o tracking original.
5. Próximas 24h: webhook `judit-webhook-oab` deve receber payloads dos novos trackings.
6. Rodar lotes restantes até zerar elegíveis.
