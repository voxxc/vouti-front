# Exibir data/hora em Trackings e Requests CNJ

## Causa raiz
No `TenantBancoIdsDialog`, o timestamp só aparece quando há registro correspondente em `monitor_audit` (toggle) ou na tabela de imports. Trackings/Requests criados antes do log de auditoria — a maioria — não exibem nada.

## Correção
`src/components/SuperAdmin/TenantBancoIdsDialog.tsx`:
- **Trackings ON/OFF** (`renderTrackingItem`): usar `lastToggleByCnj` quando existir; senão, fallback para `p.tracking_created_at` com rótulo "Registrado".
- **Requests CNJ**: usar `importByCnj` quando existir; senão, fallback para `p.created_at` (data de criação no banco_ids) com rótulo "Registrado".
- Formato mantido: `dd/MM/yyyy HH:mm` (ampliar de `dd/MM HH:mm` para incluir ano, conforme pedido "hora e data").

## Arquivos afetados
- src/components/SuperAdmin/TenantBancoIdsDialog.tsx

## Impacto
- UX: super-admin passa a ver data+hora de cada tracking (ativo ou pausado) e de cada request CNJ no diálogo Banco de IDs, mesmo para registros antigos sem auditoria.
- Dados: nenhuma migration; usa colunas `created_at` já existentes em `tenant_banco_ids`.
- Riscos: para registros pré-auditoria, a data exibida será a de criação no banco_ids (não a do toggle real) — aceitável como fallback.
- Afetados: apenas super-admins na tela `/super-admin` ao abrir o diálogo Banco de IDs.

## Validação
- Abrir Banco de IDs de um tenant: cada item nas abas Trackings ON, Trackings OFF e Requests CNJ deve mostrar data/hora no canto direito.
