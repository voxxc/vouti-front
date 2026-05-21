# Publicações por monitoramento — Tenant Demorais

Plano para alimentar a aba **Publicações** com **decisões de magistrados** detectadas automaticamente durante a sincronização de monitoramento dos processos (Judit tracking). Restrito ao tenant `demorais`. Importações por CNJ (on-demand) **não** acionam esse fluxo.

---

## Causa raiz / contexto

Hoje:
- A aba `Publicações` (`PublicacoesTab`) só é alimentada pela busca em diários oficiais (`buscar-publicacoes-pje`), via cadastro de OAB em `publicacoes_monitoramentos`.
- A função `judit-sync-monitorados` traz andamentos novos para `processos_oab_andamentos`, mas não baixa anexos automaticamente e não cria publicações.
- `judit-baixar-anexo` existe e funciona, mas é disparado manualmente pelo usuário no drawer do processo.

Não há vínculo entre "novidade de monitoramento que é uma decisão" e a aba Publicações.

---

## Correção (fluxo proposto)

1. Durante `judit-sync-monitorados`, ao gravar cada andamento novo:
   - Pré-filtrar pelo `tipo_movimentacao` / `content` do step: cair na regra se o texto bater com palavras-chave de decisão judicial (decisão, sentença, despacho decisório, julgo, homologo, defiro, indefiro, condeno, extingo, profiro decisão, decido, antecipação de tutela, liminar).
   - Verificar se o step possui `attachments` (lista de docs do Judit). Se sim, marcar como candidato.
2. Para cada candidato, baixar o(s) anexo(s) reusando a lógica de `judit-baixar-anexo` (download Judit → upload no bucket de anexos já existente).
3. Extrair texto do PDF (via `pdfjs` ou chamando uma função utilitária dedicada — ver Detalhes técnicos) e criar registro em `publicacoes` com:
   - `tipo = 'Decisão'`
   - `numero_processo = numero_cnj`
   - `conteudo_completo = texto extraído (até N caracteres)`
   - `link_acesso = signed URL do anexo no Storage`
   - `monitoramento_id = NULL` (origem distinta) — adicionar coluna `origem text default 'diario'` para diferenciar (`'monitoramento_processo'`).
   - `data_disponibilizacao = data do andamento`
   - `responsavel = órgão/juízo` (quando vier do step), `orgao` idem.
   - `status = 'nao_tratada'`.
4. Restrição de escopo: só executar passos 1–3 quando `tenant.slug = 'demorais'`. Hardcoded na Edge Function (`if (tenantSlug !== 'demorais') skip`).
5. Importações on-demand (CNJ) continuam intactas — o gatilho é exclusivo de `judit-sync-monitorados`.
6. Dedup: chave (`processo_oab_id` + `step_id` + `attachment_id`) para não criar publicação duplicada quando sync rodar novamente.

---

## Arquivos afetados

**Backend**
- `supabase/functions/judit-sync-monitorados/index.ts` — orquestrar detecção + chamada de download + insert em `publicacoes`.
- `supabase/functions/_shared/decisao-detector.ts` (novo) — regex/keywords de decisão judicial reutilizáveis.
- `supabase/functions/_shared/pdf-text.ts` (novo) — extração simples de texto via `pdfjs-dist` (Deno).
- (Opcional) refator de `judit-baixar-anexo` para extrair função baixável reutilizada server-to-server.

**Migration**
- `publicacoes`: adicionar coluna `origem text not null default 'diario'`, `processo_oab_id uuid null`, `andamento_id uuid null`, `anexo_id uuid null`, índice único `(tenant_id, processo_oab_id, andamento_id, anexo_id) WHERE origem='monitoramento_processo'`.
- `publicacoes`: relaxar `NOT NULL` do `monitoramento_id` se aplicável.

**Frontend (apenas visual do tenant Demorais)**
- `src/components/Publicacoes/PublicacoesDrawer.tsx` e/ou lista de publicações — adicionar badge "Decisão (monitoramento)" quando `origem = 'monitoramento_processo'`, e link "Abrir processo" usando `processo_oab_id`.
- `src/components/Publicacoes/PublicacaoDetalhe.tsx` — mostrar bloco "Documento" com botão para abrir/baixar o anexo via signed URL.

---

## Detalhes técnicos

- **Detecção (pelo step)**: usar `step.content` + `step.title` quando disponíveis no payload Judit. Lista de keywords em PT-BR (case-insensitive). Falso positivo aceitável — é só para escopo piloto Demorais.
- **PDF text**: `pdfjs-dist/legacy/build/pdf.js` via esm.sh; cap em ~50KB de texto salvo em `conteudo_completo` para evitar inchar a tabela. Texto completo permanece no PDF original no Storage.
- **Storage**: reaproveitar o mesmo bucket de `processos_oab_anexos`. Não criar bucket novo.
- **Performance**: download de anexo é assíncrono e potencialmente lento — fazer em lotes pequenos (max 3 em paralelo) ao final do sync, com timeout próprio para não travar a função inteira.
- **Erros**: se download falhar, criar a publicação ainda assim (sem `conteudo_completo`) com flag de erro em metadata para investigação.

---

## Impacto

**Usuário final (Demorais)**
- A aba Publicações passa a listar automaticamente **decisões judiciais** detectadas via monitoramento, com PDF anexo.
- Reduz necessidade de o advogado abrir cada processo para ver se há decisão nova.
- Pequena chance de falsos positivos (andamentos que mencionam "decisão" mas não são).

**Dados**
- Migration adiciona colunas em `publicacoes` (compatível com dados existentes via `default 'diario'`).
- Volume de `publicacoes` cresce — proporcional ao volume de decisões/dia do tenant.
- Uso adicional de Storage (PDFs já são baixados quando o usuário clica, agora serão baixados automaticamente).

**Riscos colaterais**
- Custo Judit: cada anexo baixado consome créditos. Mitigar com flag "auto-baixar decisões" em `tenant_settings` para conseguir desligar rápido.
- `judit-sync-monitorados` ficar mais lento — mitigar com paralelismo limitado e timeout.
- Dedupe falho gera publicações duplicadas — mitigado por índice único.

**Quem é afetado**
- Apenas tenant `demorais` (hardcoded). Outros tenants seguem com o fluxo atual sem mudanças.
- Super-admin e demais tenants: nenhum impacto.

---

## Validação

1. Rodar `judit-sync-monitorados` no tenant Demorais com um processo conhecido que tenha decisão recente.
2. Verificar em `processos_oab_andamentos` o novo andamento, em `processos_oab_anexos` o PDF baixado e em `publicacoes` o registro com `origem='monitoramento_processo'`.
3. Abrir a aba Publicações no front e confirmar: badge "Decisão", botão para abrir PDF, texto extraído visível.
4. Rodar sync de novo e confirmar que não duplicou (graças ao índice único).
5. Confirmar em outro tenant que **nada** foi criado em `publicacoes` pela rota de monitoramento.
