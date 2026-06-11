# Plano: Redesign + solução completa de Audiências

## Causa raiz
O drawer atual é só uma listagem read-only de cards centralizados extraídos por regex. Faltam: persistência (sem persistir não há como anexar nada), responsáveis, comentários, histórico, status (confirmada / realizada / cancelada / adiada) e um layout que mostre lista + detalhes ao mesmo tempo. Também não há sync — a cada open re-parse tudo do zero.

## Correção

### 1. Persistir as audiências (migration nova)

**`public.audiencias`**
- `processo_oab_id`, `tenant_id`
- `andamento_origem_id` (FK para `processos_oab_andamentos`, único parcial — fonte da identificação)
- `data_audiencia timestamptz`, `hora_conhecida boolean`
- `tipo text` (Conciliação / Instrução / Art. 334 / Julgamento / Mediação / Outras)
- `modalidade text` (presencial / virtual / semipresencial)
- `local text`
- `status text` default `pendente` — pendente / confirmada / realizada / cancelada / adiada
- `observacoes text`
- `criado_por uuid`
- `created_at`, `updated_at`
- UNIQUE `(processo_oab_id, data_audiencia)` para dedup

**`public.audiencia_responsaveis`** — N:N usuário ↔ audiência
- `audiencia_id`, `user_id`, `papel text` (titular / suporte), `created_at`

**`public.audiencia_comentarios`** — mesmo padrão de `deadline_comentarios`
- `audiencia_id`, `user_id`, `conteudo text`, `created_at`, `updated_at`

**`public.audiencia_historico`** — auditoria automática via trigger
- `audiencia_id`, `user_id`, `acao` (`criada`, `status_alterado`, `responsavel_adicionado`, `responsavel_removido`, `dados_alterados`, `comentario`), `de jsonb`, `para jsonb`, `created_at`

Todas com `tenant_id`, RLS por `has_role_in_tenant()`, GRANTs para `authenticated` e `service_role`. Trigger `before update` para `updated_at`; trigger `after insert/update` na `audiencias` e nas tabelas filhas para gravar em `audiencia_historico`.

### 2. Sync de andamentos → audiências
Função RPC `sync_audiencias_oab(p_tenant_id)`:
- Roda o mesmo parser do hook atual mas dentro do Postgres (regex em SQL) sobre `processos_oab_andamentos` com `descricao ILIKE '%audiência%'` + keyword de agendamento.
- Faz UPSERT em `public.audiencias` por `(processo_oab_id, data_audiencia)`.
- Marca como `realizada` automaticamente quando aparece andamento com `AUDIÊNCIA … REALIZADA` para o mesmo processo + data ±2 dias.
- Marca como `cancelada` / `adiada` em andamentos com `CANCELADA` / `REDESIGNADA`.
- Sempre que a função roda, grava linhas em `audiencia_historico` para mudanças detectadas.

Disparo: chamado uma vez quando o drawer abre (debounced via React Query `staleTime`) + botão "Sincronizar agora" no header do drawer. Sem cron por enquanto — fica simples e barato.

### 3. Redesign do drawer (layout split, sem cards centrais)

Tirar o layout `max-w-3xl mx-auto` com cards no meio. Substituir por **lista + painel de detalhes** ocupando 100% da largura do drawer:

```text
┌─ Audiências ─── [Buscar...] ── [Sincronizar] ──────────────────────────────────┐
│                                                                                 │
│ ┌──── Lista (380px) ───────┐ ┌──── Painel de detalhes (flex-1) ──────────────┐ │
│ │ Filtros:                  │ │ ░ 24 SET · qui · 13:34  [Confirmada ▾]      │ │
│ │ [Próximas] [Realizadas]   │ │   Audiência de Conciliação · Semipresencial  │ │
│ │ [Canceladas] [Todas]      │ │   CEJUSC Cascavel - Pro Cart Cível           │ │
│ │ ────────────────────────  │ │ ─────────────────────────────────────────── │ │
│ │ SETEMBRO 2026             │ │ Processo                                    │ │
│ │ ┌────────────────────┐    │ │  0001234-56.2026.8.16.0001                  │ │
│ │ │24 SET  13:34  ●●   │ ←  │ │  João da Silva × Banco XYZ                  │ │
│ │ │Conciliação         │    │ │                                              │ │
│ │ │CEJUSC Cascavel     │    │ │ Responsáveis                  [+ Adicionar] │ │
│ │ │0001234-56.2026...  │    │ │  (●) Daniel de Morais  titular  ✕           │ │
│ │ └────────────────────┘    │ │  (●) Ana Souza        suporte  ✕            │ │
│ │ ┌────────────────────┐    │ │                                              │ │
│ │ │24 SET  15:00  ●    │    │ │ Tabs: [Comentários (3)] [Histórico] [Andam.]│ │
│ │ │Instrução           │    │ │                                              │ │
│ │ └────────────────────┘    │ │ Comentários:                                 │ │
│ │ AGOSTO 2026               │ │  ┌─ Daniel · há 2h ────────────────────┐   │ │
│ │ ...                       │ │  │ Confirmar com cliente na sexta.     │   │ │
│ └───────────────────────────┘ │  └────────────────────────────────────┘   │ │
│                               │  [_______ Escrever comentário... ___] [↵] │ │
│                               └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Detalhes do redesign:
- **Lista esquerda**: rows compactas (não cards), separadas por divider, com chip-data à esquerda (`24 SET / 13:34`), tipo, local truncado, número CNJ em mono pequeno, avatares stack (max 3 + "+N") dos responsáveis, ponto colorido de status (amarelo pendente / verde confirmada / azul realizada / vermelho cancelada / cinza adiada). Linha selecionada com borda lateral primária + bg accent. Agrupado por mês com cabeçalho sticky.
- **Filtros** como segmented control no topo da lista, contadores entre parênteses.
- **Painel direito**:
  - Header: data grande + hora + dropdown de status (muda direto no banco, grava em histórico).
  - Bloco "Processo" linkável (abre o processo OAB em nova aba — reaproveita rota existente).
  - Bloco "Responsáveis": chips com avatar + papel + remover; botão `+ Adicionar` abre Popover de busca de usuários do tenant (mesmo padrão do `comment_mentions`).
  - Tabs internas: **Comentários** (lista + composer com `@menções`), **Histórico** (timeline da `audiencia_historico` com ícone por ação), **Andamento de origem** (mostra o `descricao` cru do andamento que gerou a audiência, com link).
- **Empty state da direita**: ilustração + "Selecione uma audiência para ver detalhes, responsáveis e comentários".
- **Empty state geral** (sem audiências): mantém o atual mas sem o card no centro — usa o painel direito vazio.
- Mantém gate `useIsDaniel`.

### 4. Front-end: hooks e componentes
- `useAudiencias(filtros)` — query `public.audiencias` + joins leves (processo, responsáveis, contagem comentários).
- `useAudienciaDetalhe(id)` — detalhes + responsáveis + comentários + histórico + andamento de origem.
- Mutations: `setStatus`, `addResponsavel`, `removeResponsavel`, `addComentario`, `editComentario`, `deleteComentario`, `syncAudiencias`.
- Realtime opcional no canal `audiencias` filtrado por `tenant_id` para refletir mudanças de outro usuário no mesmo drawer.

## Arquivos afetados
- **Migration nova**: 4 tabelas + GRANTs + RLS + triggers de auditoria + RPC `sync_audiencias_oab`.
- `src/hooks/useAudienciasIdentificadas.ts` → renomear/substituir por `src/hooks/useAudiencias.ts` e `src/hooks/useAudienciaDetalhe.ts`.
- `src/components/Audiencias/AudienciasDrawer.tsx` — reescrito no layout split.
- `src/components/Audiencias/AudienciaListaItem.tsx` — novo (row da lista).
- `src/components/Audiencias/AudienciaDetalhePane.tsx` — novo (painel direito).
- `src/components/Audiencias/AudienciaResponsaveis.tsx` — novo (chips + add).
- `src/components/Audiencias/AudienciaComentarios.tsx` — novo (reusa padrão de `deadline_comentarios`).
- `src/components/Audiencias/AudienciaHistorico.tsx` — novo (timeline).

## Impacto
- **Usuário final (Daniel/Solvenza)**: drawer vira uma central de audiências — lista à esquerda, detalhes à direita, status editável, responsáveis com chips, comentários com menções e histórico cronológico. Sem mais cards centralizados.
- **Dados**: 4 tabelas novas em `public` com RLS por tenant; trigger de auditoria escreve em `audiencia_historico` a cada mudança; RPC `sync_audiencias_oab` faz UPSERT lendo de `processos_oab_andamentos`. Sem retroatividade destrutiva — só adiciona. Volume esperado pequeno (729 andamentos com "audiência" hoje → ~poucas centenas de linhas em `audiencias`).
- **Riscos colaterais**: parser SQL precisa empatar com o regex do front que já foi validado (mantemos o mesmo conjunto de keywords); audiências canceladas/redesignadas dependem de o tribunal publicar andamento explícito — se não publicar, fica como `pendente` até o usuário marcar manualmente. Realtime adicional é opcional, ligado só com o drawer aberto.
- **Quem é afetado**: apenas Daniel no tenant Solvenza (gate `useIsDaniel`). Migration cria tabelas globais mas nenhum outro usuário vê a feature ainda.

## Validação
1. Migration aplica sem erro, RPC `sync_audiencias_oab('27492091-…')` popula `public.audiencias` a partir dos andamentos existentes.
2. Drawer abre, lista mostra audiências agrupadas por mês com avatares de responsáveis.
3. Selecionar item abre painel direito; mudar status grava linha em `audiencia_historico`.
4. Adicionar responsável → chip aparece, histórico registra; remover idem.
5. Postar comentário → aparece na aba Comentários, contador atualiza, histórico registra.
6. Sem audiência selecionada → empty state à direita. Outro usuário (não-Daniel) continua sem ver o botão na sidebar.
