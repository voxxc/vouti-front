## Causa raiz
Hoje só existe a aba **Revisionais** no Planejador (gated para o tenant Solvenza), apoiada na tabela `planejador_revisionais`, no hook `usePlanejadorRevisionais` e na view `PlanejadorRevisionaisView`. O usuário quer uma aba paralela e independente chamada **Mandamentais**, com o mesmo comportamento (criar, atribuir, prazo opcional, viewer/editor, fila ordenada por urgência, arquivar etc.), mas com dados separados.

## Correção

### 1. Nova tabela `planejador_mandamentais`
Réplica exata do schema de `planejador_revisionais` (mesmas colunas: `id`, `tenant_id`, `title`, `description`, `client_id`, `project_id`, `status`, `assigned_to`, `atribuido_em`, `deadline_id`, `created_by`, `created_at`, `updated_at`). Mesmas policies RLS por tenant + roles. Mesmo GRANT. Migration nova, sem mudar a tabela antiga.

### 2. Novo hook `usePlanejadorMandamentais`
Cópia 1:1 de `usePlanejadorRevisionais.ts`, trocando:
- nome da tabela (`planejador_mandamentais`)
- nomes/keys de cache do React Query (`['planejador-mandamentais', ...]`)
- nomes exportados: `useMandamentais`, `useCreateMandamental`, `useAtribuirMandamental`, `useUpdateMandamental`, `useArquivarMandamental`, `useReabrirMandamental`, `useDeleteMandamental`, interface `Mandamental`
- Mantém o mesmo enriquecimento com `deadline { id, date, completed }` e a mesma ordenação por urgência.

### 3. Nova view `PlanejadorMandamentaisView`
Cópia de `PlanejadorRevisionaisView.tsx`, ajustando:
- imports para o novo hook
- textos visíveis: "Nova Mandamental", "Mandamentais", "Pendentes/Atribuídos/Arquivados" (iguais), toasts, títulos de dialogs (`CreateMandamentalDialog`, `MandamentalViewerDialog`, `MandamentalCard`)
- chaves de query e identificadores internos
- Mantém: criação com prazo opcional, atribuir, viewer/editor inline, chip de urgência, card clicável.

### 4. Aba no topo do Planejador
Em `PlanejadorTopBar.tsx`:
- Adicionar prop `showMandamentais?: boolean`.
- Após o item Revisionais, inserir `{ id: 'mandamentais', label: 'Mandamentais' }` quando `showMandamentais` for true.

Em `PlanejadorDrawer.tsx`:
- Passar `showMandamentais={isSolvenza}` para o TopBar (mesma gate do Revisionais — Solvenza only).
- Importar `PlanejadorMandamentaisView` e renderizar quando `activeTab === 'mandamentais' && isSolvenza`, com as mesmas props passadas para Revisionais.

## Arquivos afetados
- **Novo:** migration criando `public.planejador_mandamentais` (espelho de `planejador_revisionais`, com GRANTs, RLS, policies, trigger de `updated_at`).
- **Novo:** `src/hooks/usePlanejadorMandamentais.ts` (cópia adaptada do hook de revisionais).
- **Novo:** `src/components/Planejador/PlanejadorMandamentaisView.tsx` (cópia adaptada da view de revisionais).
- **Editado:** `src/components/Planejador/PlanejadorTopBar.tsx` — nova prop + novo tab.
- **Editado:** `src/components/Planejador/PlanejadorDrawer.tsx` — gate + renderização da nova view.

Não mexer em `planejador_revisionais`, no hook nem na view existentes.

## Impacto
- **Usuário final (Solvenza):** ao lado da aba "Revisionais" aparece "Mandamentais" com a mesma UX (criar, atribuir, prazo opcional, viewer/editor, ordenação por urgência, arquivar). Dados são independentes — uma mandamental não aparece em revisionais e vice-versa. Demais tenants não veem nada.
- **Dados:** uma nova tabela `planejador_mandamentais` com mesmo formato e mesmas regras de acesso. Sem alteração em tabelas existentes. Custo de query negligenciável.
- **Riscos colaterais:** baixo — código é réplica isolada, sem cruzar com revisionais. Atenção apenas em manter as queries do React Query com chaves distintas para não compartilhar cache.
- **Quem é afetado:** apenas tenant Solvenza, mesma gate `isSolvenza` já existente.

## Validação
1. Migration aplica → `planejador_mandamentais` aparece com RLS habilitado e policies idênticas às de revisionais.
2. No Planejador (Solvenza), aba "Mandamentais" aparece ao lado de "Revisionais".
3. Criar uma Mandamental com switch de prazo ligado → aparece em "Atribuídos" com chip de urgência; verifica `deadline` correspondente.
4. Criar uma Revisional → confirma que **não** aparece em Mandamentais (isolamento de dados).
5. Tenant não-Solvenza → aba "Mandamentais" não aparece.
6. `tsgo` sem erros.
