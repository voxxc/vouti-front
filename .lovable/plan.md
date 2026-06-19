## Causa raiz
O botão `Trash2` em `SuperAdminTrackingsJudit.tsx` está fixado em `disabled` com tooltip "Em breve". Não existe edge function para apagar um tracking individual a partir do inventário (a `judit-desativar-monitoramento` existente exige `processoId` local — não serve para órfãos nem para itens identificados só pelo `tracking_id` da Judit).

## Correção

**1. Nova edge function `judit-apagar-tracking/index.ts`** (super-admin only)
- Body: `{ tracking_id: string, tipo?: 'CNJ' | 'OAB' | 'Banco' | 'Desativado' | 'Órfão', tenant_id?: string | null }`
- Valida `is_super_admin(auth.uid())` via JWT (403 se não for).
- `DELETE https://tracking.prod.judit.io/tracking/{tracking_id}` com header `api-key: JUDIT_API_KEY`. Tolera 404 (já inexistente).
- Limpeza local conforme `tipo` (idempotente — todas com `.eq('tracking_id', tracking_id)` ou `external_id`):
  - `CNJ`: `processo_monitoramento_judit` → `monitoramento_ativo=false`; `processos_oab` (linhas com esse `tracking_id`) → `monitoramento_ativo=false, tracking_id=null, tracking_request_id=null`; mover linha de `tenant_banco_ids` (`tipo='tracking'`, `external_id=tracking_id`) para `tipo='tracking_desativado'` com `metadata.motivo='super_admin_apagar_tracking'`.
  - `OAB`: `processos_oab` (mesma limpeza) + `tenant_banco_ids` mesma migração de tipo.
  - `Banco`: somente `tenant_banco_ids` (tracking → tracking_desativado).
  - `Desativado` ou `Órfão`: apenas `DELETE` na Judit + `DELETE` em qualquer linha residual de `tenant_banco_ids` com esse `external_id`.
- Retorna `{ success, juditStatus, localUpdates: { processo_monitoramento_judit, processos_oab, tenant_banco_ids } }`.

**2. `SuperAdminTrackingsJudit.tsx`**
- Remover `disabled` do botão `Trash2` e o tooltip "Em breve".
- Abrir `AlertDialog` (shadcn) por linha com:
  - Título: "Apagar tracking na Judit"
  - Descrição: mostra `tracking_id`, `tipo`, `referência`, `tenant`, alerta de irreversibilidade.
  - Confirmar → `supabase.functions.invoke('judit-apagar-tracking', { body: { tracking_id, tipo, tenant_id } })`.
  - Toast de sucesso/erro; ao concluir, remove o item da lista local (sem refetch completo) e decrementa contadores.
- Estado de loading por linha (spinner no ícone enquanto apaga).

## Arquivos afetados
- `supabase/functions/judit-apagar-tracking/index.ts` (novo)
- `src/components/SuperAdmin/SuperAdminTrackingsJudit.tsx` (editado: dialog + invoke + remove disabled)

Sem migração, sem novos secrets (usa `JUDIT_API_KEY` já existente).

## Impacto
- **Usuário final:** apenas super-admin enxerga o botão. Ação fica visível/clicável; cada clique abre confirmação antes de apagar.
- **Dados:** a chamada `DELETE` na Judit é irreversível — recriar exige novo "Ativar monitoramento" no tenant. Localmente, `monitoramento_ativo` vira `false` e o vínculo `tenant_banco_ids` (`tracking`) é arquivado em `tracking_desativado` (mesmo padrão da `judit-desativar-monitoramento`). Nenhuma linha de processo é apagada.
- **Riscos colaterais:** se o tracking estava ligado a um processo ativo do tenant, o tenant deixará de receber andamentos da Judit até reativar. Webhooks já são tolerantes a 404, sem efeitos colaterais. Para órfãos, a única consequência é liberação de slot/cobrança na Judit.
- **Quem é afetado:** somente super-admins operam; o tenant dono do tracking sofre o efeito de perda de monitoramento se o item não for órfão.

## Validação
1. Abrir `/super-admin` → "Trackings Judit".
2. Filtrar por "Apenas órfãos" → clicar `Trash2` → confirmar → toast de sucesso, item some da tabela, contadores decrementam.
3. Em um tracking `CNJ` de tenant de teste → apagar → conferir em `processo_monitoramento_judit` que `monitoramento_ativo=false` e em `tenant_banco_ids` que a linha foi para `tracking_desativado`.
4. Usuário não super-admin chamando a function direto → 403.
5. Recarregar a tabela ("Atualizar") e confirmar que o tracking apagado não retorna da Judit.
