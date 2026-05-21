# Backfill one-shot de Publicações — Demorais

Teste único para popular a aba **Publicações** do tenant `demorais` com decisões já existentes nos andamentos, só para você ver como fica visualmente. Sem baixar PDFs, sem alterar o fluxo automático.

## O que será feito

1. Uma migration SQL única (manual, sem trigger) varre `processos_oab_andamentos` do tenant `demorais`.
2. Filtra os andamentos cujo `descricao` contém palavras-chave de decisão (sentença, defiro, indefiro, liminar, homologo, julgo, despacho decisório, decisão).
3. Insere em `publicacoes` com:
   - `origem = 'monitoramento_processo'`
   - `tipo = 'Decisão'`
   - `processo_oab_id` e `andamento_id` preenchidos
   - `anexo_id` quando houver `processos_oab_anexos` com mesmo `step_id` (apenas vínculo, sem download)
   - `storage_path = NULL` (PDFs não serão baixados neste teste)
   - `status = 'nao_tratada'`
   - `data_disponibilizacao = data_movimentacao`
   - `conteudo_completo = descricao` do andamento
4. Usa o índice único anti-duplicidade já criado — rodar a migration de novo é seguro (no-op).

## Arquivos afetados

- Nova migration SQL (apenas INSERT idempotente, sem alteração de schema).
- Zero mudanças em código frontend ou Edge Functions.

## Impacto

- **Usuário final:** Aba Publicações do Demorais passa a exibir ~34 itens marcados como "Monitoramento" / "Decisão", com link para o processo. Sem botão "Abrir documento" (PDFs não baixados).
- **Dados:** ~34 linhas novas em `publicacoes` do tenant Demorais. Nada é apagado nem alterado.
- **Riscos colaterais:** Nenhum em outros tenants — filtro estrito por `tenant.slug='demorais'`. Falsos positivos possíveis (a palavra "decisão" é ampla); você pode descartar pelo próprio drawer.
- **Quem é afetado:** Apenas usuários do tenant Demorais que abrirem a aba Publicações.

## Validação

- Rodar `SELECT count(*) FROM publicacoes WHERE origem='monitoramento_processo' AND tenant_id=<demorais>` antes e depois.
- Abrir a aba Publicações no Demorais e conferir badge "Monitoramento", número do processo e conteúdo.
- Se quiser desfazer: `DELETE FROM publicacoes WHERE origem='monitoramento_processo' AND tenant_id=<demorais> AND storage_path IS NULL`.

## Próximo passo (fora deste teste)

Quando você aprovar o visual, dá pra rodar uma segunda passada que chama `judit-baixar-anexo` para cada anexo vinculado, preenchendo `storage_path` e habilitando o botão "Abrir documento".
