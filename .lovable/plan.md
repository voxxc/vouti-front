

## Trocar scraping (n8n + Firecrawl) por API oficial do CNJ no Drawer de Publicações

### Causa raiz

O modo `pje_scraper_oab` da edge function `buscar-publicacoes-pje` itera 30+ tribunais por monitoramento tentando:
1. **n8n** → retorna `404 No workspace here` (workflow morto/desativado).
2. **Firecrawl fallback** → retorna `0 items` em todos: a página DJEN é uma SPA pesada que não termina de renderizar nos 3.5s de `waitFor`, e mesmo aumentando o tempo, paginação não é tratada (só pega a 1ª página de ~10 resultados). Custo alto, lento, frágil.

Resultado: usuário não recebe nenhuma publicação, mesmo com OAB cadastrada e período válido.

**O que já existe pronto e não está sendo usado**: a função tem `parsePublicacoesApiJson` (linha 423) e o modo de teste `api_test_comunica` (linha 1061) que chamam `https://comunicaapi.pje.jus.br/api/v1/comunicacoes` — **API oficial pública do CNJ**, retorna JSON nativo com paginação, sem renderização JS, sem custo, sem rate limit agressivo.

### Correção

**Substituir o pipeline n8n→Firecrawl pela API oficial do CNJ no modo `pje_scraper_oab`**, mantendo Firecrawl apenas como último recurso emergencial (não como fallback automático em todo tribunal).

#### Backend — `supabase/functions/buscar-publicacoes-pje/index.ts`

1. Criar função `fetchComunicacoesViaApiOficial(sigla, oabNumero, oabUf, dataInicio, dataFim)`:
   - Chama `https://comunicaapi.pje.jus.br/api/v1/comunicacoes?siglaTribunal=...&numeroOab=...&ufOab=...&dataDisponibilizacaoInicio=...&dataDisponibilizacaoFim=...&itensPorPagina=100&pagina=N`.
   - Loop de paginação: incrementa `pagina` até retornar array vazio ou bater limite de segurança (50 páginas = 5000 itens por tribunal).
   - Headers: `Accept: application/json`, `User-Agent` realista.
   - Timeout de 20s por página.
   - Retry 1x em caso de 5xx/network.
   - Retorna array de itens brutos.

2. Reescrever loop principal do modo `pje_scraper_oab` (linhas ~870-1010):
   - Para cada `mon` × `sigla`:
     - Tentar `fetchComunicacoesViaApiOficial` → se sucesso (>0 itens ou resposta válida vazia), usar `parsePublicacoesApiJson` e marcar `usedSource = 'cnj_api'`.
     - Se erro de rede/timeout → registrar em `totalErrors`, **não** cair em Firecrawl automaticamente (evita custo).
   - Manter `forceSource` para debug:
     - `'auto'` (novo default) = só API CNJ.
     - `'firecrawl'` = força Firecrawl (manual, para emergência).
     - `'n8n'` = mantido para compatibilidade mas marcado como deprecated nos logs.

3. Manter `EdgeRuntime.waitUntil` (job assíncrono já implementado) — agora com latência muito menor pois API JSON é instantânea (~500ms por página) vs scraping (~30s por tribunal).

4. Logar por monitoramento: `cnj_api: TJPR/OAB 111056/PR — 3 páginas, 247 itens`.

5. Validação Zod do body permanece intacta.

#### Frontend — `src/components/Publicacoes/PublicacoesDrawer.tsx`

1. Atualizar texto do toast pós-busca: "Busca via API oficial do CNJ iniciada em segundo plano. Atualize em alguns segundos." (latência caiu drasticamente).
2. Reduzir polling automático: 10s + 30s (em vez de 15s + 60s).
3. Dropdown `forceSource` (debug) ganha 3 opções claras: `Auto (CNJ API)` / `Firecrawl (emergência)` / `n8n (legado)`.

### Arquivos afetados

**Modificados:**
- `supabase/functions/buscar-publicacoes-pje/index.ts` — nova função `fetchComunicacoesViaApiOficial` com paginação; loop do modo `pje_scraper_oab` reescrito para usar API CNJ como primário; Firecrawl/n8n viram opt-in via `force_source`.
- `src/components/Publicacoes/PublicacoesDrawer.tsx` — textos de toast, intervalos de polling, opções do dropdown debug.

**Sem mudanças:** schema do banco, RLS, `parsePublicacoesApiJson` (já existe), `parsePublicacoesPjeOab` e `parseDjenFromMarkdown` (mantidos para fallback Firecrawl manual), `PublicacoesTab` em Extras, validação Zod do range de datas, lógica de upsert/dedupe.

### Impacto

**Usuário final (UX):**
- Busca passa a **funcionar de fato** — API oficial não bloqueia, retorna JSON paginado real.
- Latência cai de ~30s/tribunal (Firecrawl) para ~1-2s/tribunal (API). Range de 30 dias com 5 tribunais: de ~3min para ~10s.
- Histórico longo (90 dias) finalmente acessível sem perda por paginação.
- Sem mudança visual significativa: mesmos botões, mesma listagem.

**Dados:**
- Zero migration. Mesma tabela `publicacoes`, mesmo upsert/dedupe (CNJ + data + descrição normalizada) → rodar 2x = 0 duplicados.
- Volume potencialmente maior por busca (paginação real captura tudo) — comportamento esperado e desejado.
- `metadata.fonte` passa a registrar `'cnj_api'` permitindo auditar origem.

**Riscos colaterais:**
- API CNJ pode ter rate limit não documentado — mitigação: timeout 20s + retry 1x + log de erro por tribunal sem abortar o lote.
- Estrutura JSON da API pode variar entre tribunais — `parsePublicacoesApiJson` já tem fallback flexível de campos (linhas 456-490), mas alguns tribunais novos podem precisar ajuste de mapeamento (ajustável depois pelos logs).
- Firecrawl deixa de ser fallback automático → se um dia a API CNJ cair, usuário precisa selecionar manualmente "Firecrawl (emergência)" no dropdown debug. Aceitável: mantém custo controlado e comportamento previsível.
- Workflow n8n morto continua existindo mas só roda se forçado — pode ser limpo numa próxima manutenção.

**Quem é afetado:**
- Admins do módulo jurídico que usam o drawer de Publicações em Extras. Único papel com acesso.
- Nenhum outro módulo, tenant ou integração afetado.

### Validação

1. Abrir Drawer de Publicações no `/demorais` → clicar "Novidades" → toast confirma busca em background.
2. Aguardar ~10s → publicações aparecem na listagem (esperado: dezenas/centenas dependendo da OAB).
3. Logs do edge function mostram: `cnj_api: TJPR/OAB 111056/PR — N páginas, M itens` para cada tribunal × monitoramento.
4. Rodar "Buscar período → Últimos 30 dias" → confirma paginação funcionando (ver páginas múltiplas nos logs).
5. Rodar a mesma busca 2x consecutivas → 2ª roda sem inserir duplicados (dedupe intacto).
6. Forçar via dropdown debug "Firecrawl (emergência)" → confirma que o caminho legacy ainda funciona como antes.
7. Tentar URL de teste manual via `mode: 'api_test_comunica'` no DevTools → confirma resposta JSON válida da API CNJ.

