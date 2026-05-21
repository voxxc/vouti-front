# Teste visual de Publicação via CNJ — assíncrono (sem travar o loading)

Você digita o CNJ num campo no Super-Admin, clica e o card aparece em alguns segundos sem barra de loading travada. O trabalho pesado roda em background.

## Causa raiz

A função `judit-test-publicacao-cnj` faz polling síncrono na Judit (POST `/requests` → aguardar → GET `/responses` → baixar PDF → extrair texto). Isso ultrapassa o timeout do Edge Function, então o botão fica em "loading" eterno e o usuário nunca vê o resultado.

## Correção

Dividir em **iniciar** + **trabalho em background** + **status visível na tela**.

1. Nova tabela `publicacao_test_jobs` (id, tenant_id, numero_cnj, status `pending|processing|completed|failed`, publicacao_id, error_message, created_by, timestamps). RLS: só Super-Admin.
2. Refatorar `judit-test-publicacao-cnj`:
   - Recebe `{ numero_cnj }`, valida Super-Admin, cria linha em `publicacao_test_jobs` com status `pending`.
   - Dispara `EdgeRuntime.waitUntil(processarJob(jobId))` e responde **imediatamente** `202 { jobId }`.
   - `processarJob` faz POST Judit, polling do response, download do PDF, upload no bucket, extração de texto, insert em `publicacoes` (origem `monitoramento_processo`, tenant Demorais) e atualiza o job para `completed` com o `publicacao_id` (ou `failed` com mensagem).
3. Substituir o componente `SuperAdminTestPublicacaoCNJ.tsx`:
   - Campo de input do CNJ + botão "Gerar publicação de teste".
   - Lista abaixo dos últimos jobs do Super-Admin com badge de status (Pendente / Processando / Concluído / Falhou) e botão "Abrir publicação" quando concluído.
   - Realtime na tabela `publicacao_test_jobs` para atualizar o card sem refresh.

## Arquivos afetados

- Migration: cria `publicacao_test_jobs` + RLS Super-Admin + habilita realtime.
- `supabase/functions/judit-test-publicacao-cnj/index.ts` (refatorada para async com `EdgeRuntime.waitUntil`).
- `src/components/SuperAdmin/SuperAdminTestPublicacaoCNJ.tsx` (campo + lista de jobs com realtime).
- Sem mudança em `publicacoes` nem no bucket — schema já existe.

## Impacto

- **Usuário final (Super-Admin):** Botão responde em <1s, card aparece na lista como "Processando" e vira "Concluído" em ~10–30s sem loading travado. Tenant Demorais vê a publicação na aba Publicações como antes.
- **Dados:** Nova tabela `publicacao_test_jobs` (pequena, só registros de teste). `publicacoes` continua recebendo 1 linha por teste bem-sucedido. Sem mudança em RLS de outras tabelas.
- **Custo / API:** Igual ao atual — 1 request Judit + 1 download de PDF por CNJ testado.
- **Riscos colaterais:** Nulos para outros tenants — a função continua restrita ao Demorais. Realtime adiciona uma assinatura leve só enquanto o Super-Admin tem o painel aberto.
- **Quem é afetado:** Só Super-Admin (dispara/vê jobs) e usuários do Demorais (veem a publicação resultante).

## Validação

1. Digitar um CNJ com decisão recente e clicar em gerar.
2. Confirmar que o botão volta ao normal imediatamente e o card aparece como "Processando".
3. Em ~30s o card vira "Concluído" sozinho (realtime). Clicar em "Abrir publicação" e ver o PDF no Demorais.
4. Testar um CNJ inválido para ver o card virar "Falhou" com mensagem clara.

## Reversão

`DROP TABLE publicacao_test_jobs;` + reverter a função para a versão síncrona anterior. Nenhum dado de produção é afetado.