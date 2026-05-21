# Corrigir leitura de anexos da Judit (array top-level)

## Causa raiz
A Judit não devolve `attachments` dentro de cada `step`. Devolve um **array top-level** `response_data.attachments`, e cada item carrega `step_id`, `attachment_id`, `attachment_name`, `extension`, `status` e `attachment_date`. O vínculo step↔anexo é feito pelo `step_id`.

Hoje a edge function `judit-test-publicacao-cnj` procura `step.attachments`, que nunca existe nesse shape — por isso devolve "Nenhum andamento com anexo encontrado", mesmo quando o request tem PDFs.

## Correção
Em `supabase/functions/judit-test-publicacao-cnj/index.ts`, no `processarJob`:

1. Após obter `responseData`, ler `responseData.attachments` (top-level). Fallback para `response_data.attachments` se vier aninhado.
2. Filtrar anexos válidos:
   - `status === 'done'`
   - `corrupted !== true`
   - `extension` ∈ aceitos (pdf, html — descarta `html` se quisermos só PDF visualizável; manter ambos por enquanto).
3. Para cada anexo, encontrar o step correspondente via `step_id` (lookup no array `steps`) para extrair `content`/`step_date` e classificar como Decisão.
4. Limitar a 10 anexos mais recentes (ordenar por `attachment_date desc`).
5. Manter a lógica atual de download → upload no bucket → insert em `publicacoes`.
6. Atualizar a mesma lógica em `judit-sync-monitorados` para consistência (hoje também lê `step.attachments` — silenciosamente não cria nada).

## Arquivos afetados
- `supabase/functions/judit-test-publicacao-cnj/index.ts` (leitura do array top-level + lookup por step_id)
- `supabase/functions/judit-sync-monitorados/index.ts` (mesma correção no fluxo automático de publicações)

## Impacto
- **Usuário (Super-Admin):** o teste com request_id `0e27516b…` agora encontra os 3+ anexos (DESPACHO/DECISÃO em HTML, custas em PDF, guias em PDF) e cria 1 publicação por anexo no tenant Demorais.
- **Usuário (tenant Demorais):** o monitoramento passa a alimentar a aba Publicações automaticamente — antes não criava nada por causa do mesmo bug. Pode aparecer um volume grande na primeira sincronização pós-deploy.
- **Dados:** sem migration. Inserts adicionais em `publicacoes` com `origem='monitoramento_processo'`. Storage recebe os PDFs em `{tenant_id}/_teste_publicacao/…` (teste) ou no path padrão (sync).
- **Riscos colaterais:** anexos com `extension='html'` ficam como blob HTML no bucket — abrem como página, não como PDF. Vou manter classificação correta no `metadata.extension`. Anexos `corrupted=true` ou `status!='done'` são ignorados.
- **Quem é afetado:** Super-Admin (ferramenta de teste) e usuários do tenant Demorais (publicações automáticas). Outros tenants só serão afetados quando o piloto for liberado.

## Validação
1. Reexecutar o teste com `request_id = 0e27516b-43aa-48af-a7af-9f1194236afb`.
2. Logs devem mostrar `N anexo(s) válidos` (N>0).
3. Histórico do card: "Concluído" com `3 anexos (1º: DESPACHO/DECISÃO…)`.
4. Aba Publicações do Demorais: 3 registros novos com badge "Monitoramento", abrindo o documento via signed URL.

## Causa / Necessidade
Quando um Request CNJ já foi disparado na Judit (e ficou registrado o `request_id`), faz sentido pular o POST `/requests` e ir direto consultar `/responses?request_id=...`. Isso evita gastar uma nova consulta on-demand e é mais rápido (a resposta já está pronta).

Caso atual: `request_id = 0e27516b-43aa-48af-a7af-9f1194236afb` — queremos puxar os anexos desse request e materializar uma Publicação no tenant Demorais.

## Correção / Implementação

### 1. Edge Function: aceitar `request_id` direto
Em `supabase/functions/judit-test-publicacao-cnj/index.ts`:

- Aceitar no body: `{ request_id?: string, numero_cnj?: string }`. Pelo menos um obrigatório.
- Se vier `request_id`, pular o POST `/requests` e ir direto ao polling do `/responses`.
- Se só vier `numero_cnj`, manter o fluxo atual (POST → polling).
- Quando vier `request_id`, derivar `numero_cnj` do próprio `response_data.code` (a Judit retorna o CNJ).
- Em vez de pegar **só** o último step com anexo, processar **todos os steps com anexos** (cada um vira uma publicação). Hoje o teste só cria 1.
- Cada publicação herda: classificação "Decisão" se o texto bater nas keywords, senão "Publicação".

### 2. UI Super-Admin
Em `src/components/SuperAdmin/SuperAdminTestPublicacaoCNJ.tsx`:

- Adicionar um segundo input opcional: "Request ID Judit (opcional)".
- Quando preenchido, envia `request_id` no body e ignora CNJ.
- Label do card de histórico mostra o `request_id` quando aplicável.
- Botão "Gerar publicação de teste" passa a aceitar qualquer um dos dois preenchido.

### 3. Tabela `publicacao_test_jobs`
Adicionar coluna `request_id text null` para registrar a origem. Migration simples.

## Arquivos afetados
- `supabase/functions/judit-test-publicacao-cnj/index.ts` (refatorar fluxo)
- `src/components/SuperAdmin/SuperAdminTestPublicacaoCNJ.tsx` (novo input + exibição)
- Migration: adicionar `request_id` em `publicacao_test_jobs`

## Impacto
- **Usuário (Super-Admin):** ganha um atalho para reaproveitar requests Judit já existentes. Pode gerar múltiplas publicações de teste de uma vez (uma por step com anexo).
- **Dados:** nova coluna `request_id` em `publicacao_test_jobs`. Continua restrito ao tenant Demorais. Publicações criadas mantêm flag `teste: true` em `metadata`.
- **Riscos colaterais:** se o `request_id` tiver muitos steps com anexos, o job demora mais (cada anexo é um download + upload). Mantemos `EdgeRuntime.waitUntil` (5 min limite). Para mitigar, limitar a, ex.: 10 anexos mais recentes por job.
- **Quem é afetado:** somente Super-Admins na aba Ferramentas.

## Validação
1. Disparar teste com `request_id = 0e27516b-43aa-48af-a7af-9f1194236afb`.
2. Logs devem mostrar quantos steps com anexos foram encontrados.
3. Histórico deve listar N cards "Concluído" (um por anexo), todos com botão "Abrir PDF".
4. Aba Publicações do tenant Demorais deve exibir os registros novos com badge "Monitoramento".