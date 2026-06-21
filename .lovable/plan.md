## Objetivo
No painel de detalhes do processo (Super Admin), permitir: (1) excluir qualquer movimento, (2) marcar movimentos como "sigiloso" e atribuir tag de tribunal (eproc, projudi, pje, esaj, tjgo antigo, ou customizado), (3) gerenciar (CRUD) os tribunais via sub-diálogo, (4) reordenar movimentos via drag-and-drop liberado por um cadeado.

## Causa raiz
O painel atual só lista andamentos e permite criar via diálogo. Não há exclusão, metadados de "sigiloso"/"tribunal-tag", catálogo de tribunais customizáveis nem ordenação manual.

## Correção

### A. Banco

#### A.1. Nova tabela `super_admin_tribunais_andamento`
Catálogo global gerenciado pelo Super Admin.
- Colunas: `id`, `slug` (único, `lower`), `nome`, `cor` (hex, opcional), `created_by`, `created_at`, `updated_at`.
- RLS: SELECT para `authenticated` (qualquer usuário pode ler — só vai ver no painel se for Super Admin); INSERT/UPDATE/DELETE só para super admin (via Edge Function com service role; RLS deny por padrão exceto super admins via `EXISTS super_admins`).
- GRANTs: `SELECT, INSERT, UPDATE, DELETE` para `authenticated`; `ALL` para `service_role`.
- Seed inicial: `eproc`, `projudi`, `pje`, `esaj`, `tjgo-antigo`.

#### A.2. Coluna `super_admin_ordem` em `processos_oab_andamentos`
- `ALTER TABLE processos_oab_andamentos ADD COLUMN super_admin_ordem INTEGER`.
- Quando `NULL`, usar `data_movimentacao` como fallback de ordenação.
- Quando preenchido, ordena DESC por `super_admin_ordem` (números maiores aparecem em cima).

Sigiloso e tag de tribunal vão em `dados_completos` (JSON, sem schema change):
- `dados_completos.sigiloso: boolean`
- `dados_completos.tribunal_tag: string` (slug do catálogo)

### B. Edge Functions

#### B.1. `super-admin-listar-tribunais-andamento` (GET-like via POST)
Retorna lista do catálogo. Validação: super admin.

#### B.2. `super-admin-gerenciar-tribunal-andamento`
Action union: `criar`, `editar`, `excluir`. Body:
- criar: `{ slug, nome, cor? }`
- editar: `{ id, nome?, cor? }` (slug imutável após criação para não quebrar refs)
- excluir: `{ id }` — bloqueia se houver andamentos referenciando o slug, ou faz soft warn.

#### B.3. `super-admin-deletar-andamento`
Body: `{ andamento_id }`. Apaga o registro de `processos_oab_andamentos` e o anexo no Storage (se houver `dados_completos.anexo.storage_path`). Valida super admin.

#### B.4. `super-admin-atualizar-andamento`
Body: `{ andamento_id, sigiloso?, tribunal_tag?: string|null }`. Faz merge no `dados_completos` (preservando outros campos) via update parcial.

#### B.5. `super-admin-reordenar-andamentos`
Body: `{ processo_oab_id, ordem: string[] }` — array de IDs do topo para o fim. Atribui `super_admin_ordem` decrescente (ex.: N, N-1, …) em uma transação.

#### B.6. Atualizações no `super-admin-criar-andamento-manual`
- Aceitar `sigiloso?: boolean` e `tribunal_tag?: string` no body.
- Ao criar com `super_admin_ordem` ausente, atribuir `(MAX(super_admin_ordem) ou 0) + 1` no processo, garantindo que o novo apareça no topo da lista reordenada.

#### B.7. `super-admin-processo-oab-detalhes`
- Adicionar `super_admin_ordem` ao `select` dos andamentos.
- Ordenar por `super_admin_ordem DESC NULLS LAST, data_movimentacao DESC`.

### C. Frontend

#### C.1. `AdicionarMovimentoManualDialog` (já com abas)
- Adicionar por aba: checkbox "Sigiloso" e seletor "Tribunal" (Combobox com itens do catálogo + "Sem tribunal").
- Botão "Gerenciar tribunais" no rodapé do seletor → abre `GerenciarTribunaisDialog`.
- Enviar `sigiloso` e `tribunal_tag` no payload do salvar.

#### C.2. Novo `GerenciarTribunaisDialog`
- Lista do catálogo com nome, slug, swatch de cor.
- Adicionar (form com nome, slug auto-derivado editável, cor).
- Editar nome/cor inline.
- Excluir com confirmação.
- Atualiza o seletor pai ao fechar.

#### C.3. `SuperAdminProcessoOABDetalhesPanel`
- Cabeçalho da seção "Andamentos": ícone de cadeado (`Lock`/`LockOpen`). Estado local `reordenando`. Ao destravar:
  - Cards exibem alça de arrastar (`GripVertical`).
  - DnD via `@dnd-kit/core` + `@dnd-kit/sortable` (já presentes no projeto — verificar `package.json`; instalar se necessário).
  - Ao soltar, chamada otimista que reordena o array local e dispara `super-admin-reordenar-andamentos`. Em erro, reverte.
  - Travar (clicar de novo no cadeado) é só visual.
- Em cada card de andamento, novos badges:
  - "Sigiloso" (variant `destructive`) se `dados_completos.sigiloso`.
  - Tribunal (variant `outline` colorido) se `dados_completos.tribunal_tag` resolver no catálogo.
- Ações inline em cada card (visíveis sempre):
  - Editar metadados (sigiloso/tribunal) → pequeno popover/dialog.
  - Excluir (lixeira) → `confirm`, depois `super-admin-deletar-andamento`, recarrega.
- Ao recarregar, preserva ordem ditada pelo backend.

## Arquivos afetados

Migrations:
- nova migration: tabela `super_admin_tribunais_andamento`, coluna `super_admin_ordem`, seed.

Edge Functions:
- nova: `supabase/functions/super-admin-listar-tribunais-andamento/index.ts`
- nova: `supabase/functions/super-admin-gerenciar-tribunal-andamento/index.ts`
- nova: `supabase/functions/super-admin-deletar-andamento/index.ts`
- nova: `supabase/functions/super-admin-atualizar-andamento/index.ts`
- nova: `supabase/functions/super-admin-reordenar-andamentos/index.ts`
- editada: `supabase/functions/super-admin-criar-andamento-manual/index.ts`
- editada: `supabase/functions/super-admin-processo-oab-detalhes/index.ts`

Frontend:
- editado: `src/components/SuperAdmin/AdicionarMovimentoManualDialog.tsx`
- novo: `src/components/SuperAdmin/GerenciarTribunaisDialog.tsx`
- novo: `src/components/SuperAdmin/EditarMetaAndamentoPopover.tsx` (sigiloso/tribunal inline)
- editado: `src/components/SuperAdmin/SuperAdminProcessoOABDetalhesPanel.tsx`

## Impacto
1. **UX**:
   - Super Admin ganha controle total sobre os andamentos: excluir, marcar sigiloso, taggear tribunal e reordenar livremente.
   - Catálogo de tribunais é compartilhado entre todos os processos/tenants — o que for criado aqui aparece em todos os formulários.
   - O cadeado fica visível só no painel; precisa destravar antes de arrastar (evita reordenação acidental).
2. **Dados**:
   - Nova tabela `super_admin_tribunais_andamento` (5 linhas seed iniciais).
   - Nova coluna `super_admin_ordem` em `processos_oab_andamentos` (default `NULL` — não impacta dados existentes).
   - Anexos órfãos: ao excluir um andamento manual, o objeto correspondente no bucket `andamentos-manuais-docs` é removido.
   - Ordenação muda quando há `super_admin_ordem`; processos sem reordenação manual continuam exatamente como hoje (ordenados por `data_movimentacao`).
3. **Riscos colaterais**:
   - Excluir andamentos automáticos (Judit/Escavador) é destrutivo — eles podem reaparecer se o monitoramento rodar e re-sincronizar (depende da lógica de dedup `dedup_hash`). Usuário ciente.
   - Mudar ordem manual para um andamento e depois receber novos andamentos automáticos: novos entram com `super_admin_ordem = NULL` e caem por baixo dos manualmente ordenados. Aceitável; pode ser revisto futuramente.
   - Excluir um tribunal do catálogo deixa andamentos com `tribunal_tag` orfão; a UI mostra a tag bruta como fallback, sem cor.
4. **Quem é afetado**: apenas Super Admins. Tenants/advogados continuam vendo os andamentos como hoje, com badges adicionais ("Sigiloso"/tribunal) quando o Super Admin marcar.

## Validação
1. Rodar a migração e confirmar 5 tribunais seed (`eproc`, `projudi`, `pje`, `esaj`, `tjgo-antigo`).
2. Abrir um processo OAB e verificar que a ordem inicial dos andamentos não mudou.
3. No diálogo de novo movimento: marcar sigiloso, escolher tribunal "pje", salvar; confirmar que o card mostra os badges "Sigiloso" e "PJE".
4. Abrir "Gerenciar tribunais": criar "TJSP-1G" com cor; editar nome; usar no formulário; excluir o tribunal e ver fallback bruto no card existente.
5. Clicar na lixeira de um andamento: confirmar exclusão; se manual com anexo, validar que o arquivo sumiu do bucket.
6. Destravar cadeado, arrastar 3º card para o topo, travar; recarregar a página; ordem persistiu.
7. Voltar a checkbox de sigiloso: editar inline e ver o badge sumir; trocar tribunal e ver a tag mudar.
8. Tentar usar todas as funções deslogado / sem ser super admin → 401/403.