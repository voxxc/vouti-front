

## Adicionar Firecrawl como fonte de scraping do DJEN (com fallback automático para n8n)

### Causa raiz / Motivação

Hoje o scraping de publicações do DJEN/PJe Comunicações depende de **um único caminho**: o webhook n8n self-hosted em `voutibot.app.n8n.cloud/webhook/tjpr-scraper` (modo `pje_scraper_oab`). Se o n8n cair, ficar lento ou for bloqueado pelo CloudFront futuramente, **as publicações param de chegar** — sem alternativa automática. Além disso, o n8n exige manutenção manual de servidor, tem latência variável e não tem SLA.

Firecrawl resolve isso com:
- Pool de proxies residenciais brasileiros que bypassam o CloudFront do CNJ.
- Renderização JavaScript completa (necessária pra SPA Angular do `comunica.pje.jus.br`).
- API pronta, sem manter servidor.
- Já tem connector oficial integrado no Lovable — sem secret manual.

### Correção

**1. Conectar o connector Firecrawl** (uma vez, via UI da Lovable) — disponibiliza `FIRECRAWL_API_KEY` automaticamente nas Edge Functions.

**2. Criar novo modo `firecrawl_oab`** em `supabase/functions/buscar-publicacoes-pje/index.ts`:
- Itera os `monitoramentos` ativos (mesma lógica do `pje_scraper_oab`).
- Para cada par `(tribunal, OAB)`, monta a URL do `comunica.pje.jus.br/consulta?siglaTribunal=X&numeroOab=Y&ufOab=Z&dataDisponibilizacaoInicio=...&dataDisponibilizacaoFim=...`.
- Chama `POST https://api.firecrawl.dev/v2/scrape` com:
  - `formats: ['markdown', 'html']`
  - `onlyMainContent: true`
  - `waitFor: 3000` (espera SPA renderizar)
  - `location: { country: 'BR' }` (força proxy brasileiro)
- Reaproveita o parser `parsePublicacoesPje` existente (já testado, funcional) sobre o HTML retornado.
- Insere em `publicacoes` com mesmo `upsert + onConflict` já usado, garantindo zero duplicata cross-fonte.

**3. Estratégia de fallback automático** em `pje_scraper_oab`:
- Tenta n8n primeiro (mantém comportamento atual).
- Se n8n retornar erro (status ≠ 200, timeout, ou `items.length === 0` por 3 tribunais consecutivos), automaticamente faz fallback pra Firecrawl no mesmo loop, **sem o usuário perceber**.
- Loga claramente qual fonte respondeu (`source: 'n8n'` vs `source: 'firecrawl'`) por tribunal.

**4. Toggle manual no PublicacoesDrawer** (opcional, polimento):
- Botão "Atualizar" continua disparando o modo unificado `pje_scraper_oab` (com fallback embutido).
- Adicionar dropdown discreto "⚙ Forçar fonte" → `auto` (default) / `n8n` / `firecrawl`, pra debug.

### Arquivos afetados

**Modificados:**
- `supabase/functions/buscar-publicacoes-pje/index.ts`
  - Nova função helper `scrapeViaFirecrawl(url, options)` que chama a API REST do Firecrawl.
  - Nova função `parseDjenFromMarkdown(markdown, html, ...)` — wrapper que tenta o regex existente sobre o HTML; se falhar, faz fallback parsing sobre o markdown estruturado do Firecrawl (mais limpo e estável).
  - Modo `pje_scraper_oab` ganha lógica de fallback: tenta n8n → se falhar, tenta Firecrawl pra mesma combinação `(sigla, oab)`.
  - Novo modo isolado `firecrawl_oab` (pra forçar via dropdown manual).
  - Variável `forceSource` aceita `'auto' | 'n8n' | 'firecrawl'` no body.
- `src/components/Publicacoes/PublicacoesDrawer.tsx`
  - Adicionar dropdown opcional "Forçar fonte" no botão de atualizar.
  - Toast de feedback inclui qual fonte respondeu (n8n/firecrawl/misto).

**Criados:**
- Nenhum arquivo novo.

**Connector necessário:**
- `firecrawl` — via tool `standard_connectors--connect`. Sem connector, modo `firecrawl_oab` retorna erro claro pedindo conexão.

**Sem mudanças:** banco, RLS, tabela `publicacoes`, schema de `monitoramentos`, demais Edge Functions, lógica de deduplicação.

### Impacto

**Usuário final (UX):**
- Botão "Atualizar publicações" no PublicacoesDrawer continua funcionando idêntico — agora mais resiliente.
- Se n8n cair, publicações continuam chegando (fallback automático em segundos).
- Toast pode mostrar "12 novas publicações (n8n: 8, firecrawl: 4)" pra transparência.
- Dropdown de fonte fica escondido (acionado por ícone de engrenagem) — não polui UI normal.

**Dados:**
- Zero migration, zero mudança de schema/RLS.
- Mesmo `upsert onConflict` impede duplicatas mesmo com 2 fontes simultâneas.
- Latência similar ao n8n (Firecrawl cobra por scrape, ~$0.001 cada).

**Riscos colaterais:**
- **Custo:** Firecrawl é pago por request. Pra ~50 monitoramentos × 5 tribunais médios = 250 scrapes/dia ≈ $0.25/dia ≈ $7,5/mês. Baixo, mas existe. O fallback automático só dispara quando n8n falha, então em uso normal o custo é zero.
- **Rate limit:** Firecrawl free tier tem 500 scrapes/mês. Se exceder, o user precisa upgrade (avisamos com toast claro).
- **Parser:** O HTML do `comunica.pje.jus.br` deve voltar idêntico ao que o n8n retorna (mesma URL, mesmo CloudFront destino), então o regex `parsePublicacoesPje` existente deve funcionar 1:1. Se o Firecrawl entregar markdown em vez de HTML, o fallback de parsing pelo markdown cobre.
- Nenhum risco em outros módulos — escopo cirúrgico no `buscar-publicacoes-pje`.

**Quem é afetado:**
- Tenants jurídicos que usam Controladoria → Push-Doc → publicações (todos).
- Operação fica mais robusta sem o usuário precisar fazer nada.

### Validação

1. Conectar Firecrawl via UI → confirmar `FIRECRAWL_API_KEY` em `fetch_secrets`.
2. Abrir Controladoria → PublicacoesDrawer → clicar "Atualizar".
3. **Esperado caminho feliz:** n8n responde, comportamento idêntico ao atual.
4. **Forçar Firecrawl** via dropdown "⚙ Forçar fonte → firecrawl" → publicações chegam, mesmo formato, sem duplicatas.
5. **Simular falha do n8n** (mudar URL temporariamente pra inválida em ambiente de teste) → fallback automático pra Firecrawl, toast indica fonte mista.
6. Conferir logs da Edge Function (`supabase--edge_function_logs buscar-publicacoes-pje`) — devem mostrar `source: 'firecrawl'` quando fallback dispara.
7. Rodar duas vezes seguidas → segunda execução insere 0 (deduplicação intacta).
8. Verificar no banco: `SELECT COUNT(*) FROM publicacoes WHERE created_at > NOW() - INTERVAL '5 min'` — sem registros duplicados.

