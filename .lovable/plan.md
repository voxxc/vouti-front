# Modelo de card na seção Publicações (resultado dos anexos)

Hoje a edge `judit-test-publicacao-cnj` já cria 10 publicações em Demorais a partir do request `0e27516b…`, mas elas **não aparecem** no drawer de Publicações porque:

- `status = 'nao_lida'` → o filtro do drawer só conhece `nao_tratada / tratada / descartada`.
- Filtro de período padrão = últimos 7 dias (publicações estão entre 2025-12 e 2026-03).
- `conteudo_completo` vazio → card fica sem preview, sem texto pra busca.
- `nome_pesquisado / comarca / diario_*` nulos → linha do card aparece "vazia".
- O documento abre só em nova aba (signed URL); não há preview embutido.

## Correção

### 1. Edge `judit-test-publicacao-cnj` (e depois replicar em `judit-sync-monitorados`)
- Gravar `status = 'nao_tratada'` (compatível com filtros).
- Extrair texto do anexo:
  - PDF → `pdfjs-dist` (já usado em sync).
  - HTML → strip de tags + decode entities → `conteudo_completo`.
- Preencher campos derivados do processo / step:
  - `nome_pesquisado` = nome do cliente vinculado (ou parte autora do `processos_oab`).
  - `comarca`, `orgao`, `diario_sigla` = vindos do step (tribunal/órgão) / fallback "Monitoramento Judit".
  - `tipo` = "Decisão" (sem o sufixo "(teste)" em produção; manter "(teste)" só pra jobs disparados pelo Super-Admin).
  - `responsavel` = magistrado quando detectável no texto, senão null.
- Manter `origem = 'monitoramento_processo'`, `processo_oab_id`, `andamento_id`, `anexo_id`, `storage_path`.

### 2. Card da lista (`PublicacoesDrawer.tsx`)
Novo "modelo" visual quando `origem === 'monitoramento_processo'`:

```text
┌────────────────────────────────────────────────────────────┐
│ [Decisão] [Monitoramento]            há 2h · 19/03/2026    │
│ 4000436-45.2025.8.26.0411                                  │
│ DESPACHO/DECISÃO 1 — 70 KB · PDF                           │
│ "Vistos. Defiro o pedido de…" (trecho do conteúdo)         │
│ [Abrir documento] [Marcar tratada] [Descartar]             │
└────────────────────────────────────────────────────────────┘
```

- Badge primária "Decisão" + badge outline "Monitoramento" (sem ícone de jornal).
- Nome do anexo + tamanho extraídos de `processos_oab_anexos` (join leve por `anexo_id` ou parse do `attachment_name`).
- Trecho de 180 chars do `conteudo_completo`.
- Ações inline (não precisa abrir detalhe pra tratar/descartar).

### 3. Detalhe (`PublicacaoDetalhe.tsx`)
- Quando `origem = monitoramento_processo` e existe `storage_path`:
  - Bloco "Documento" no topo com preview embutido (`<iframe>` para PDF, `<iframe srcdoc>` para HTML) usando signed URL.
  - Botão "Abrir em nova aba" como secundário.
- Esconder campos irrelevantes (Diário, Comarca quando nulos) e mostrar bloco "Processo vinculado" com link para abrir o drawer do processo (`processo_oab_id`).

### 4. Filtro do drawer
- Aceitar `nao_lida` como alias de `nao_tratada` (migration backfill `update publicacoes set status='nao_tratada' where status='nao_lida'`).
- Quando há publicações com `origem='monitoramento_processo'`, adicionar chip rápido "Decisões monitoradas" no topo dos filtros.

## Arquivos afetados
- `supabase/functions/judit-test-publicacao-cnj/index.ts` (extração de texto + campos).
- `supabase/migrations/<novo>.sql` (backfill `nao_lida → nao_tratada`).
- `src/components/Publicacoes/PublicacoesDrawer.tsx` (card "modelo" + filtro).
- `src/components/Publicacoes/PublicacaoDetalhe.tsx` (preview embutido + link processo).

## Impacto
- **Usuário final (Demorais):** passa a ver na aba Publicações um card distinto para cada decisão capturada por monitoramento, com preview do documento e trecho do conteúdo — sem precisar abrir o processo. Workflow `nao_tratada → tratada` funciona igual ao DJEN.
- **Dados:** backfill troca status `nao_lida → nao_tratada` (idempotente, só afeta 10 linhas de teste hoje). Nenhuma alteração de schema. PDFs continuam no bucket `processo-documentos` sob `{tenant_id}/_teste_publicacao/…`.
- **Riscos colaterais:** extração de texto pesada em HTMLs grandes pode aumentar o tempo de processamento do job (mitigado: limite 50KB de texto, parsing assíncrono). Iframe inline exige signed URL renovável — gerar sob demanda no detalhe (TTL 10min, como hoje).
- **Quem é afetado:** apenas tenant Demorais (origem do teste). Quando replicarmos em `judit-sync-monitorados`, afeta todos os tenants com tracking ativo — fica fora deste plano.

## Validação
1. Disparar novo job no Super-Admin reusando `request_id 0e27516b…`.
2. Abrir Publicações do Demorais → filtro "tudo" → card "Decisão · Monitoramento" deve aparecer com preview de texto.
3. Abrir detalhe → iframe do PDF deve renderizar inline.
4. Marcar como tratada → status persiste e o card sai da contagem "Não tratadas".
