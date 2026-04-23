

## Tornar Firecrawl a única fonte de busca de Publicações

### Causa raiz / Motivação

Hoje o modo `pje_scraper_oab` da edge function `buscar-publicacoes-pje` usa **CNJ API como padrão** (`force_source: 'auto' = cnj_api`), com Firecrawl apenas como opção manual. O usuário quer o inverso: **Firecrawl como única fonte primária**, removendo CNJ API e n8n da rotação automática.

Para que o Firecrawl funcione de fato (e não retorne 0 itens como antes), é necessário **resolver os 2 problemas conhecidos** do scraper atual:
1. **Renderização incompleta** — `waitFor: 3500ms` é insuficiente para a SPA do DJEN.
2. **Sem paginação** — pega apenas a 1ª página (~10 resultados), perdendo o resto.

### Correção

#### Backend — `supabase/functions/buscar-publicacoes-pje/index.ts`

1. **Reescrever `scrapeDjenViaFirecrawl`** para suportar paginação:
   - Loop de páginas: incrementa parâmetro `pagina` na URL DJEN (`&pagina=N`) até retornar markdown sem novos itens ou bater limite de segurança (30 páginas = ~300 resultados por tribunal).
   - Aumentar `waitFor` para **8000ms** (SPA pesada precisa de tempo).
   - Adicionar `actions: [{ type: 'wait', milliseconds: 5000 }]` no payload Firecrawl para garantir renderização pós-carregamento JS.
   - Acumular markdown de todas as páginas e passar para `parseDjenFromMarkdown` em lote.
   - Logar: `firecrawl: TJPR/OAB 111056/PR — N páginas, M itens`.

2. **Mudar default do `force_source`** de `'auto'` (CNJ API) para `'firecrawl'`:
   - `'firecrawl'` (novo default) → scraping Firecrawl com paginação.
   - `'cnj_api'` → opt-in manual via dropdown debug (mantido para emergência).
   - `'n8n'` → mantido como legacy/deprecated.

3. **Reescrever loop principal** do modo `pje_scraper_oab`:
   - Para cada `mon` × `sigla`: chamar Firecrawl direto.
   - Sem fallback automático para CNJ API (se Firecrawl falhar num tribunal, registra erro e segue).
   - Aumentar delay entre tribunais para **1500ms** (Firecrawl tem rate limit ~10 req/s no plan padrão).

4. **Manter** `EdgeRuntime.waitUntil` (job assíncrono já implementado) — Firecrawl com paginação pode levar 1-3 min para múltiplos tribunais.

5. **Manter** `parseDjenFromMarkdown` (já existe e funciona com regex robusta de CNJ + datas + descrição).

#### Frontend — `src/components/Publicacoes/PublicacoesDrawer.tsx`

1. **Atualizar toast pós-busca**: "Busca via Firecrawl iniciada em segundo plano. Pode levar 1-3 minutos. Atualize em breve."
2. **Aumentar polling automático** de volta para 30s + 90s (Firecrawl é mais lento que API).
3. **Reordenar dropdown debug `forceSource`**:
   - `Firecrawl (padrão)` ← default selecionado
   - `CNJ API (emergência)`
   - `n8n (legado)`

### Arquivos afetados

**Modificados:**
- `supabase/functions/buscar-publicacoes-pje/index.ts` — `scrapeDjenViaFirecrawl` reescrita com paginação + `waitFor` 8s + actions; loop principal aponta direto para Firecrawl; default do `force_source` mudado para `'firecrawl'`.
- `src/components/Publicacoes/PublicacoesDrawer.tsx` — toast, polling intervals, ordem do dropdown debug.

**Sem mudanças:** schema do banco, RLS, `parseDjenFromMarkdown` (já existe), `parsePublicacoesApiJson` (mantida só para opt-in CNJ API), validação Zod, lógica de upsert/dedupe, secret `FIRECRAWL_API_KEY` (já configurado).

### Impacto

**Usuário final (UX):**
- Firecrawl vira a única fonte automática — comportamento previsível e único, conforme solicitado.
- Latência **maior** que CNJ API: ~30-90s por tribunal × N tribunais. Range de 30 dias com 5 tribunais ≈ 2-5 min (vs ~10s da CNJ API). Aceitável pelo usuário pois pediu Firecrawl explicitamente.
- Toast e polling mais longos refletem essa latência real.
- Resultados agora **completos** (paginação real) — diferentemente do estado anterior onde só vinha a 1ª página.

**Dados:**
- Zero migration. Mesma tabela `publicacoes`, mesmo upsert/dedupe → rodar 2x = 0 duplicados.
- `metadata.fonte` passa a registrar `'firecrawl'` em todos os inserts automáticos.

**Riscos colaterais:**
- **Custo Firecrawl**: cada página = 1 crédito. 5 tribunais × 3 páginas média = 15 créditos por busca. Range de 90 dias pode chegar a 50+ créditos. Monitorar consumo no dashboard Firecrawl.
- **Rate limit Firecrawl**: mitigado com delay 1500ms entre tribunais e timeout 60s por scrape.
- **Possibilidade de falha em tribunais específicos**: se um tribunal cair, log registra erro mas lote continua. Usuário pode reexecutar.
- **CNJ API ainda existe**: opt-in via dropdown debug "CNJ API (emergência)" caso Firecrawl tenha problema pontual.

**Quem é afetado:**
- Apenas admins do módulo jurídico (drawer de Publicações em Extras). Nenhum outro módulo, tenant ou integração afetado.

### Validação

1. Abrir Drawer de Publicações em `/demorais` → clicar "Novidades" → toast confirma busca Firecrawl em background.
2. Aguardar 1-3 min → publicações aparecem na listagem.
3. Logs do edge function mostram: `firecrawl: TJPR/OAB 111056/PR — N páginas, M itens` para cada tribunal × monitoramento.
4. Rodar "Buscar período → Últimos 30 dias" → confirma paginação funcionando (múltiplas páginas nos logs por tribunal).
5. Rodar a mesma busca 2x consecutivas → 2ª roda sem inserir duplicados.
6. Confirmar dropdown debug mostra `Firecrawl (padrão)` como primeira opção e selecionada por default.
7. Forçar via dropdown debug "CNJ API (emergência)" → confirma que caminho alternativo ainda funciona.
8. Verificar consumo Firecrawl no dashboard após 1 ciclo completo de busca.

