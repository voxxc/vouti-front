

## Filtros de período e busca incremental no Drawer de Publicações

### Causa raiz / Motivação

Hoje o backend (`buscar-publicacoes-pje`, modo `pje_scraper_oab`) **já está vinculado** ao monitoramento configurado em **Extras → Publicações** — itera `publicacoes_monitoramentos` ativos e usa OAB + tribunais cadastrados. O que falta é controle no frontend:

1. **Período fixo de 5 dias** hardcoded no Edge Function — usuário não consegue buscar histórico maior (ex: últimos 30/60 dias).
2. **Listagem mostra todas as publicações sem filtro de data** — sem como ver apenas "o que chegou hoje" ou "esta semana".
3. **Sem botão dedicado a "novidades"** — só existe o "Buscar DJEN" que é manual e demorado. Falta um atalho rápido pra incremento desde a última checagem.

### Correção

**1. Backend (`supabase/functions/buscar-publicacoes-pje/index.ts`):**
- No modo `pje_scraper_oab`, aceitar parâmetros opcionais no body:
  - `data_inicio` (YYYY-MM-DD) — sobrescreve o range fixo de 5 dias.
  - `data_fim` (YYYY-MM-DD).
  - `dias_retroativos` (number) — alternativa: usa `today - N days`. Default = 5 (mantém comportamento atual).
- Validar com Zod (data válida, range máximo de 90 dias pra não estourar custo Firecrawl).
- Logar o range usado por monitoramento.

**2. Frontend (`src/components/Publicacoes/PublicacoesDrawer.tsx`):**

  **a) Dois botões no header (substituem o atual "Buscar DJEN"):**
  - **"Novidades"** (primário, destaque visual): chama Edge Function com `dias_retroativos: 2` — busca rápida só do que é novo (últimas 48h). Toast: "X novas publicações desde ontem".
  - **"Buscar período..."** (secundário): abre popover com Date Range Picker (shadcn `Calendar` mode="range") com presets:
    - Hoje
    - Últimos 7 dias (default)
    - Últimos 15 dias
    - Últimos 30 dias
    - Personalizado
  - Após escolher, dispara Edge Function com `data_inicio`/`data_fim` selecionadas.

  **b) Filtro de período na listagem (cliente-side):**
  - Adicionar dropdown "Período" ao lado do filtro de status com mesmas opções (Hoje / 7 dias / 15 dias / 30 dias / Tudo).
  - Filtra `publicacoes` pelo `data_disponibilizacao` localmente (já temos os dados em memória).
  - Default: "7 dias" (evita listar tudo desnecessariamente).

  **c) Persistir "última busca" em localStorage:**
  - Chave `publicacoes_ultima_busca_${tenantId}` com timestamp.
  - Botão "Novidades" usa esse timestamp pra calcular `data_inicio` automaticamente (ou fallback: 2 dias).
  - Mostrar discretamente abaixo do header: "Última atualização: há 3h" (formato relativo).

  **d) Ajustar contadores:**
  - Manter os 4 cards atuais (Hoje/Tratadas hoje/Descartadas hoje/Pendentes total) — já estão bons.

**3. Manter intactos:**
- `force_source` (dropdown debug) — fica como está.
- Lógica n8n → Firecrawl fallback — não muda.
- Tabela `publicacoes` e RLS — não muda.
- `PublicacoesTab` em Extras — não muda.

### Arquivos afetados

**Modificados:**
- `supabase/functions/buscar-publicacoes-pje/index.ts` — aceitar `data_inicio`/`data_fim`/`dias_retroativos` no modo `pje_scraper_oab`.
- `src/components/Publicacoes/PublicacoesDrawer.tsx` — 2 botões (Novidades + Buscar período), dropdown de filtro de período, popover com Calendar range, persistência de "última busca".

**Sem mudanças:** banco, RLS, `PublicacoesTab`, lógica de scraping, parsers, deduplicação.

### Impacto

**Usuário final (UX):**
- Botão "Novidades" vira o uso primário diário — clica de manhã, vê só o que chegou desde ontem em 5 segundos.
- Botão "Buscar período" pra investigações pontuais ou recuperar histórico.
- Listagem filtrada por padrão (7 dias) — não polui com publicações antigas.
- Indicador "Última atualização: há Xh" dá contexto sem precisar abrir log.
- Nenhuma config nova: usa o que já está cadastrado em Extras → Publicações.

**Dados:**
- Zero migration. Lógica de upsert/dedupe inalterada → buscar 30 dias 2x não duplica nada.
- Custo Firecrawl: range maior = mais scrapes só quando user pede explicitamente. "Novidades" mantém custo baixo (range 2 dias, mesmo do default atual).
- Rate limit Firecrawl preservado (cap de 90 dias no backend).

**Riscos colaterais:**
- Buscar período longo (30+ dias) demora mais — mostrar spinner com mensagem "Pode levar 1-2 min".
- localStorage por tenant — se user trocar de tenant, "última busca" é independente (correto).
- Filtro cliente-side limitado aos 200 últimos registros (limit atual do `fetchPublicacoes`). Se user filtrar "Tudo" e tiver mais de 200, faltam dados. **Mitigação:** aumentar limit pra 500 ou paginar — proposta usar 500.

**Quem é afetado:**
- Admins do módulo jurídico (única role com acesso ao drawer de Publicações).
- Nenhum outro módulo afetado.

### Validação

1. Cadastrar/garantir 1 monitoramento ativo em Extras → Publicações (OAB + tribunais).
2. Abrir drawer de Publicações → clicar "Novidades" → toast mostra contagem do range curto (2 dias).
3. Clicar "Buscar período" → escolher "Últimos 30 dias" → confirmar — Edge Function roda com range correto, deduplicação intacta (rodar 2x = 0 duplicados na 2ª).
4. Range "Personalizado" com Calendar → escolher datas → busca executa.
5. Tentar range > 90 dias via DevTools → backend retorna 400 com mensagem clara.
6. Trocar dropdown "Período" da listagem → filtra cliente-side sem rechamar API.
7. Indicador "Última atualização" atualiza após cada busca bem-sucedida.
8. Logs do Edge Function (`buscar-publicacoes-pje`) mostram range usado por monitoramento.

