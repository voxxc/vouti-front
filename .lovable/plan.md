## Causa raiz

Hoje só o Escavador alimenta `processos_oab_andamentos`. Para casos onde a movimentação chegou por outra via (intimação em papel, contato direto do cartório, processo sigiloso sem capa), o Super Admin precisa lançar manualmente — e a UI dos usuários (Central de Não Lidos, badge, drawer do processo) deve reagir como se fosse um andamento normal.

## Correção

Nova entrada **"Movimentos manuais"** no card do tenant (Super Admin) → drawer com lista de processos OAB do tenant → ao escolher um, abre dialog de cadastro com upload opcional de documento. Insere via Edge Function (service role) garantindo cross-tenant + storage.

### 1. Pill no card do tenant
- Em `TenantRow.tsx`, dentro do `<ActionGroup label="Auditoria">`, adicionar:
  ```
  <PillButton icon={FilePlus2} onClick={() => setShowMovManuais(true)}>Movimentos manuais</PillButton>
  ```

### 2. Drawer `SuperAdminMovimentosManuaisDrawer.tsx` (novo)
- Recebe `tenantId` + `tenantNome`.
- Header com busca (CNJ / parte ativa / parte passiva) e contador.
- Lista virtualizada paginada de `processos_oab` do tenant (RPC ou select via Edge Function — para evitar barreira de RLS no Super Admin), exibindo: CNJ, partes, OAB associada, total de andamentos, última movimentação.
- Cada item tem botão "Adicionar movimento" → abre dialog.

### 3. Dialog `AdicionarMovimentoManualDialog.tsx` (novo)
Campos:
- **Data da movimentação** (date picker, default hoje, obrigatório)
- **Nome do movimento** (texto curto, obrigatório — ex.: "Intimação", "Decisão", "Sentença")
- **Descrição/detalhe** (textarea, obrigatório, mínimo 10 chars)
- **Documento (opcional)** — input file, aceita PDF/DOC/DOCX/JPG/PNG, máx 25 MB.
- Checkbox "Marcar como não lido para os usuários do tenant" (default: ✓ marcado).

Botões: Cancelar / Salvar.

### 4. Edge Function `super-admin-criar-andamento-manual` (nova)
Chamada via `supabase.functions.invoke` com bearer do super admin. Fluxo:
1. Validar Bearer e checar `super_admins` table — caso contrário 403.
2. Validar input com Zod.
3. Se houver arquivo (base64 no body), fazer upload em bucket `andamentos-manuais-docs/{tenant_id}/{processo_oab_id}/{uuid}.{ext}` (bucket privado).
4. Gerar `manualId = crypto.randomUUID()`.
5. Insert em `processos_oab_andamentos`:
   - `processo_oab_id`, `tenant_id`
   - `data_movimentacao = <data informada>`
   - `tipo_movimentacao = <nome>`
   - `descricao = <descrição>`
   - `lida = !marcarNaoLido` (false → aparece como não lido na Central)
   - `dedup_hash = 'manual-' || manualId`
   - `dados_completos = { id: manualId, origem: 'manual', criado_por_super_admin: true, super_admin_email, criado_em, anexo: { storage_path, name, size, content_type } | null }`
6. Atualizar `processos_oab.ultima_atualizacao = now()` e incrementar `total_atualizacoes`.
7. Inserir um signal em `whatsapp_sync_signals` ou disparar postgres NOTIFY já existente — não necessário porque o realtime de `andamentos-nao-lidos-global` já escuta INSERTs em `processos_oab_andamentos`.
8. Retornar `{ ok: true, andamento_id, anexo_url? }`.

### 5. Bucket de storage `andamentos-manuais-docs`
- Privado.
- RLS em `storage.objects`:
  - SELECT: `auth.uid()` cujo tenant atual = primeiro segmento do `name` (mesmo padrão dos outros buckets tenant-prefixados).
  - INSERT/UPDATE/DELETE: somente service_role (via Edge Function).
- Permite usuários comuns do tenant baixarem o documento depois.

### 6. Integração com a UI dos usuários
- `processos_oab_andamentos` realtime já é escutado por `useAndamentosNaoLidosGlobal` → Central de Não Lidos pisca automaticamente. Nada a alterar.
- Em `ProcessoOABDetalhes.tsx`, na renderização de andamentos, adicionar:
  - Badge cinza "Manual" quando `dados_completos.origem === 'manual'`.
  - Quando `dados_completos.anexo` existe, mostrar ícone de paperclip que gera signed URL via `supabase.storage.from('andamentos-manuais-docs').createSignedUrl(path, 3600)` e abre em nova aba.

## Arquivos afetados

- `src/components/SuperAdmin/TenantRow.tsx` — pill nova + state + render do drawer
- `src/components/SuperAdmin/SuperAdminMovimentosManuaisDrawer.tsx` — novo
- `src/components/SuperAdmin/AdicionarMovimentoManualDialog.tsx` — novo
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — badge "Manual" + link anexo
- `supabase/functions/super-admin-criar-andamento-manual/index.ts` — nova edge function
- Migration: criação do bucket `andamentos-manuais-docs` (privado) + policies de SELECT por prefixo `{tenant_id}/`

## Impacto

**Usuário final (UX/telas/fluxos):**
- Super Admin: nova pill "Movimentos manuais" no card do tenant. Drawer + dialog para lançamento rápido com upload opcional.
- Usuários do tenant: andamento manual aparece em tempo real na Central de Não Lidos com badge "(N) novos", o processo sobe na ordenação por última movimentação, e abre normalmente no drawer do processo com badge "Manual" + clipe para baixar o documento.
- Notificação realtime já existente em `processos_oab_andamentos` cobre tudo sem código novo no front do tenant.

**Dados (migrations/RLS/performance):**
- Sem mudanças em schemas de tabelas — `dados_completos` JSONB e `dedup_hash` cobrem origem/anexo.
- Novo bucket `andamentos-manuais-docs` (privado) + 1 policy de SELECT em `storage.objects` por prefixo de tenant.
- Edge function usa service role, contornando RLS de `processos_oab` e `processos_oab_andamentos` somente para super admins (verificação dupla via tabela `super_admins`).
- Reprocessamento Escavador (cache/V2) não toca os manuais por causa do prefixo `manual-` no `dedup_hash`.

**Riscos colaterais:**
- Manual entra nas métricas de "não lidos" e "última movimentação" — desejado, mas pode confundir auditoria. Mitigado pela badge "Manual" e por log no `dados_completos.criado_por_super_admin`.
- Heurística de "intimação urgente" pode capturar manuais com palavras-chave de prazo. Aceitável (intenção real).
- Sigilosos sem capa: continuam funcionando normalmente — manuais não dependem de `capa_completa`.
- Storage: arquivos crescem por tenant; bucket privado reduz risco de exposição.

**Quem é afetado:**
- Apenas super admins têm acesso à pill (verificação no front + na edge function).
- Todos os tenants ficam aptos a receber andamentos manuais lançados pelo super admin.
- Advogados/controllers/usuários do tenant veem o andamento como qualquer outro, com identificação visual de origem manual.

## Validação

1. Logado como super admin → card de um tenant → pill "Movimentos manuais" → drawer lista processos do tenant.
2. Escolher processo, lançar com data, nome "Intimação teste", descrição e PDF anexado → salvar.
3. Logar como advogado do mesmo tenant → Central de Não Lidos atualiza em < 2s mostrando o processo com 1 não lido.
4. Abrir o processo → andamento aparece no topo com badge "Manual" e clipe para abrir o PDF (signed URL).
5. Outro tenant não vê o andamento (RLS preserva).
6. Reprocessar do cache do Escavador no processo → manual permanece intacto.
7. Marcar como lido → desce a contagem corretamente.
