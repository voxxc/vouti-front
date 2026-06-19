## Causa raiz / Necessidade

Antes de apagar, o super-admin precisa **enxergar** o que existe na Judit: lista completa de trackings (ativos e pausados), com filtro por status, para decidir o que deletar. Hoje só temos visões locais (`processo_monitoramento_judit`, `tenant_banco_ids`), que podem estar dessincronizadas com a Judit real.

A Judit expõe:
- `GET https://tracking.production.judit.io/tracking?page=1&page_size=100` — lista todos.
- `GET .../tracking?page=1&page_size=100&status=paused` — só pausados.
- `DELETE .../tracking/{tracking_id}` — apagar individual (já usado em `judit-desativar-monitoramento`).

A API key Judit é global da plataforma (não por tenant nesse endpoint de tracking — o tracking é por `customer_key` da Judit). Logo a visualização é **global**, não por tenant — coerente com a tela existente `SuperAdminCofreJudit` / `SuperAdminMonitoramento`.

## Correção

1. **Nova edge function `judit-listar-trackings`** (super-admin only):
   - Body: `{ status?: 'active' | 'paused' | 'all', page?: number, pageSize?: number, fetchAll?: boolean }`.
   - Valida `is_super_admin(auth.uid())` via JWT.
   - Faz `GET /tracking` na Judit com `api-key: JUDIT_API_KEY`. Se `fetchAll`, pagina até esvaziar.
   - Para cada tracking, **enriquece** com dados locais: faz lookup em `processo_monitoramento_judit.tracking_id`, `processos_oab.tracking_id`, `tenant_banco_ids.external_id` para descobrir o `tenant_id`, nome do tenant (`tenants.nome`), CNJ, e tipo (CNJ/OAB/CNPJ/órfão).
   - Retorna lista unificada: `{ tracking_id, status, created_at, recurrence, reference (CNJ/OAB), tenant_id, tenant_nome, tipo, orfao: boolean }`.

2. **Nova página/aba `SuperAdminTrackingsJudit.tsx`** em `src/components/SuperAdmin/`:
   - Tabela com colunas: Status, Tracking ID, Tipo, Referência (CNJ/OAB), Tenant, Criado em, Ações.
   - Filtros no topo: status (Todos / Ativos / Pausados), tenant (select), tipo, "Apenas órfãos" (existe na Judit mas não no banco).
   - Busca livre por CNJ / OAB / tracking_id.
   - Contadores no header: "Total: N • Ativos: X • Pausados: Y • Órfãos: Z".
   - Ações por linha (placeholder por enquanto): botão `Trash2` desabilitado com tooltip "Em breve" — o delete será habilitado num próximo passo.
   - Paginação local (já vem tudo via `fetchAll`) + virtualização leve se >500 linhas.

3. **Integração no menu super-admin**: adicionar entrada/aba "Trackings Judit" no mesmo agrupamento de `SuperAdminCofreJudit` / `SuperAdminMonitoramento` (em `src/pages` que monta o super-admin — verificar `Dashboard.tsx`/rota `/super-admin`).

## Arquivos afetados

- `supabase/functions/judit-listar-trackings/index.ts` (novo)
- `src/components/SuperAdmin/SuperAdminTrackingsJudit.tsx` (novo)
- Página/menu do super-admin que renderiza as abas Judit (a confirmar na exploração — provavelmente `src/pages/Dashboard.tsx` ou container do `/super-admin`) — adicionar aba/entrada.

Sem migration. Sem secret novo (`JUDIT_API_KEY` já existe).

## Impacto

- **Usuário final (super-admin):** ganha uma tela de inventário Judit fiel ao estado real da API, com filtros e contadores. Tenants comuns não veem nada.
- **Dados:** somente leitura nesta etapa — nenhuma escrita, nenhuma migration. Pode haver carga maior na API Judit ao paginar tudo; mitigado por `page_size=100` e cache em memória de 60s no estado do componente.
- **Riscos colaterais:**
  - Listagem grande pode estourar timeout da função em contas com milhares de trackings — mitigamos com `fetchAll=false` por padrão e botão "Carregar mais".
  - Trackings órfãos (sem registro local) ficam visíveis e marcados — pode revelar inconsistências históricas (efeito desejado).
  - Nenhum risco de exclusão acidental: ações destrutivas ficam para o passo seguinte.
- **Quem é afetado:** apenas super-admin. Sem efeito em advogados, admins de tenant ou dados de clientes.

## Validação

1. Abrir `/super-admin` → nova aba "Trackings Judit" aparece.
2. Tela carrega com status "Todos"; contadores batem com `length` por status.
3. Trocar filtro para "Pausados" → chama Judit com `status=paused`; lista reduz; contador "Pausados" = total exibido.
4. Trackings com `tracking_id` presente em `processo_monitoramento_judit` mostram tenant + CNJ; demais aparecem como "Órfão".
5. Busca por um CNJ conhecido localiza a linha correspondente.
6. Logar como usuário comum → função retorna 403; aba não aparece no menu.
7. Botão de deletar permanece desabilitado (tooltip "Em breve") — confirmação de que esta entrega é só visualização.
