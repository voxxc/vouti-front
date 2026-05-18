# Auditoria de Processos Parados — por tenant no Super-Admin

## Causa raiz
Hoje a auditoria existente no Super-Admin (`SuperAdminAuditoriaAndamentos`) é global e técnica (foco em sync Judit). Não existe uma forma rápida do dono do SaaS abrir um tenant específico e ver "quais processos deste cliente estão sem movimentação real do tribunal há X dias".

## Correção
Adicionar um botão no `TenantCard` (linha de ferramentas) que abre um diálogo dedicado ao tenant com a lista de processos parados.

### Botão
- Ícone: `Clock` (lucide-react), variant `ghost`, mesmo tamanho dos demais botões da linha de ferramentas.
- Tooltip: "Auditoria de processos parados".
- Posição: ao lado do botão Push-Docs / Banco de IDs.

### Diálogo `TenantProcessosParadosDialog`
- Cabeçalho com nome do tenant.
- Seletor de período no topo: 15 / 30 / 60 / 90 dias (default 30).
- Contador resumo: "X processos sem movimentação há mais de N dias".
- Tabela paginada (usa `fetchAllPaginated` se necessário) com colunas:
  - CNJ
  - Cliente (parte principal)
  - OAB monitoradora
  - Última movimentação (data + "há X dias")
  - Ação: botão "Abrir no tenant" (abre `/{slug}/processos/{cnj}` em nova aba)
- Filtros: ignora processos com `created_at` mais recente que o período (evita falso positivo de processos recém-importados).
- Read-only (sem migration, sem "marcar como auditado" nesta fase).

### Query
```sql
SELECT id, numero_cnj, ultima_movimentacao, created_at, oab_numero, cliente_nome
FROM processos_oab
WHERE tenant_id = :tenant_id
  AND ultima_movimentacao < now() - interval ':dias days'
  AND created_at < now() - interval ':dias days'
ORDER BY ultima_movimentacao ASC NULLS FIRST
```
Sem `auth.uid()` — o Super-Admin já tem bypass via RLS por `is_super_admin()`.

## Arquivos afetados
- `src/components/SuperAdmin/TenantCard.tsx` — adiciona botão + estado `showParados`.
- `src/components/SuperAdmin/TenantProcessosParadosDialog.tsx` — novo componente (diálogo + tabela + filtro).
- `src/hooks/useTenantProcessosParados.ts` — novo hook (query React Query parametrizada por `tenantId` e `dias`).

## Impacto
1. **Usuário final (você, dono do SaaS):** ganha 1 clique no card de cada tenant para ver processos parados, sem sair do Super-Admin. Não afeta o cliente — feature 100% interna.
2. **Dados:** zero migration nesta fase. Apenas leitura de `processos_oab.ultima_movimentacao` (já existente e populado pelo sync Judit/n8n).
3. **Riscos colaterais:** baixíssimos. Query indexada por `tenant_id`; se algum tenant tiver >10k processos parados, paginação resolve. Se vier lento, adicionamos índice parcial `(tenant_id, ultima_movimentacao)` em fase 2.
4. **Quem é afetado:** somente Super-Admins. Nenhum tenant, advogado ou usuário final vê nada.

## Validação
1. `/super-admin` → localizar um tenant com processos antigos.
2. Clicar no ícone Clock → diálogo abre com seletor em 30 dias.
3. Trocar para 15/60/90 → contador e lista atualizam.
4. Clicar "Abrir no tenant" → nova aba abre o processo no contexto do tenant correto.
5. Confirmar que processos importados nos últimos 30 dias (sem `ultima_movimentacao`) **não** aparecem em "30 dias".
