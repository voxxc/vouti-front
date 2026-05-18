# Sincronizar "Processos Incompletos" com a lista real

## Causa raiz

O diálogo "Processos Incompletos — SOLVENZA" mostra exatamente o que está no banco. Consulta direta confirma que os 6 CNJs ainda existem em `processos_oab` com `detalhes_request_id IS NULL`. Eles **não foram apagados** — a função `excluirProcesso` em `src/hooks/useOABs.ts` bloqueia a exclusão quando `monitoramento_ativo = true`, e todos os 6 estão monitorados. O usuário provavelmente viu o toast "Exclusão bloqueada" e o item sumiu da tela local, mas continua no DB.

CNJs ainda presentes:
- 0049328-72.2024.8.16.0021
- 0007995-47.2025.8.16.0170
- 1001916-10.2023.8.26.0111
- 7005383-36.2023.8.22.0003
- 0041397-47.2025.8.16.0000
- 2372688-76.2025.8.26.0000

## Correção proposta (duas frentes)

### 1. UX — destravar a exclusão a partir do diálogo de Incompletos
No `TenantProcessosIncompletosDialog`, adicionar uma ação "Excluir" ao lado de "Recarregar" que:
- Desativa o monitoramento (`monitoramento_ativo = false`).
- Apaga andamentos vinculados.
- Apaga o registro em `processos_oab`.
- Atualiza a lista local + dispara `onComplete()`.

Botão extra "Excluir todos" no header do diálogo para limpar em lote (com confirmação).

### 2. Confiabilidade — refresh forte
- Trocar o `setTimeout(fetchProcessos, 1500)` por refetch imediato + invalidação do hook `useIncompleteProcessosCount` (passar `refetch` por prop ou via callback `onComplete`).
- Garantir que ao fechar/reabrir o diálogo a lista seja sempre recarregada (já é, mas validar).

## Arquivos afetados

- `src/components/SuperAdmin/TenantProcessosIncompletosDialog.tsx` — adicionar ações de exclusão (singular e em lote).
- `src/components/SuperAdmin/TenantRow.tsx` / `TenantRowMobile.tsx` — passar `refetch` do contador para o `onComplete` do diálogo.
- (opcional) `src/hooks/useIncompleteProcessosCount.ts` — já expõe `refetch`, só plugar.

Nenhuma migração SQL necessária — a permissão de DELETE já existe via RLS para super_admin/tenant owner.

## Impacto

1. **Usuário final (Super-Admin):** ganha botão "Excluir" e "Excluir todos" diretamente no diálogo de incompletos, sem precisar desativar monitoramento manualmente em cada OAB. Contador no card do tenant cai imediatamente após a ação.
2. **Dados:** DELETE real em `processos_oab` + `processos_oab_andamentos` dos registros listados. Operação irreversível — exige diálogo de confirmação.
3. **Riscos colaterais:** processos excluídos somem também das telas de OAB do tenant (CRM/Controladoria). Como o usuário declarou que quer descartá-los, é o comportamento desejado. Sem efeito em outros tenants.
4. **Quem é afetado:** apenas super-admin (o diálogo só aparece lá). Tenant comum não vê mudança de UI.

## Validação

- Abrir o diálogo na SOLVENZA → confirmar lista com 6 itens.
- Clicar "Excluir todos" → confirmar → lista zera, badge no card vai a 0.
- Query: `SELECT count(*) FROM processos_oab WHERE tenant_id=<solvenza> AND detalhes_request_id IS NULL` deve retornar 0.
