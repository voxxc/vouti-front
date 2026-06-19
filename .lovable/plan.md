## Causa raiz

Logs do `judit-buscar-processo-cnj` (Daniel, 18:06):

```
Payload: {"search":{"search_type":"lawsuit_cnj","search_key":"70000478920268220021","on_demand":true,"search_params":{"credential":{"customer_key":"alanpjero"}}}}
Request ID: c464e113-...
Polling tentativa 1 - page_data: 1
Estrutura resposta: { hasSteps: true, stepsLength: 0, ..., responseKeys: "code, instance, name, secrecy_level, tribunal_acronym, justice, ..., parties" }
Processo criado: 13a9f104-...
Tentativa steps 1..2..3 → Nenhum step encontrado
Concluido: { andamentosInseridos: 0 }
```

A Judit não está rejeitando — ela aceita a credencial `alanpjero` e devolve a **capa** do processo (`code, instance, parties, courts, ...`), mas com `steps: []`. O processo é criado, porém sem andamentos, e por isso o usuário acha que "não saiu". Dois problemas reais alimentam isso:

1. **Polling principal sai cedo demais.** O loop em `judit-buscar-processo-cnj` (linhas 217-252) interrompe assim que `page_data.length > 0`. Para `on_demand: true` com credencial, a Judit costuma devolver **dois itens** em `page_data`: o primeiro é só a capa (sem `steps`) e o segundo é o resultado completo da consulta paga (com `steps` populado), que chega 30-90s depois. Ao parar no primeiro, pegamos só a capa. As "Tentativas steps 1..3" de fallback acontecem, mas com apenas ~5 s de espera entre cada — insuficiente para o tribunal devolver os passos.
2. **Payload diverge do que o usuário valida no Postman.** O Postman dele usa `search_key` formatado (`7000047-89.2026.8.22.0021`) e inclui `with_attachments: false` no body. A função envia só os dígitos e omite `with_attachments`. Para alguns tribunais a Judit muda o pipeline de consulta conforme esses parâmetros, e o "with_attachments: false" sinaliza explicitamente que queremos só os steps (sem aguardar download de anexos). Isso também ajuda a destravar a entrega dos passos.

## Correção

### `supabase/functions/judit-buscar-processo-cnj/index.ts`

1. **Aguardar até `steps` chegarem, não apenas `page_data`.**
   - No loop principal (linhas 217-252), substituir a condição de saída por: percorrer **todos** os itens de `page_data` e considerar concluído somente quando algum item tiver `steps`/`movements`/`andamentos` com `length > 0`. Manter `maxAttempts = 60` (~2 min) e fallback final que aceita `page_data > 0` se ao menos a capa veio (para preservar o caminho "processo mínimo" atual).
   - Aumentar a primeira espera de 3 s para 5 s e o intervalo entre tentativas de 2 s para 3 s nas primeiras 10 tentativas (a Judit não devolve steps antes disso para on-demand).
2. **Alinhar payload ao Postman do usuário.**
   - Adicionar `with_attachments: false` no nível raiz do body (não dentro de `search`), conforme o print.
   - Usar como `search_key` o CNJ **com máscara** (`7000047-89.2026.8.22.0021`) quando o input já vier formatado; manter fallback para dígitos somente se vier sem máscara. Hoje a função força `replace(/\D/g, '')` em algum ponto antes da chamada — passar a usar o `numero_cnj` original.
3. **Manter o caminho "processo mínimo".** Se após o novo polling ainda não vierem steps, manter o comportamento atual de gravar com `dadosCompletos: false`, mas no toast do frontend deixar claro que o processo foi criado com a capa e os andamentos virão pelo monitoramento (não é "erro").

Sem mudança no frontend e sem nova credencial. Nenhum schema novo.

## Arquivos afetados

- `supabase/functions/judit-buscar-processo-cnj/index.ts` — único arquivo a alterar (loop de polling, payload, search_key).

## Impacto

1. **UX/telas**: ao importar um processo CNJ, a importação vai demorar mais até 2 min (em vez de retornar em ~10 s com 0 andamentos). Em troca, o processo aparece na listagem **com partes, tribunal e andamentos preenchidos**, que era a expectativa do usuário. O toast intermediário já existe ("Importando em segundo plano"), então o tempo extra não trava a UI.
2. **Dados**: nenhuma migration. Mesma tabela `processos_oab` + `processos_oab_andamentos`. Pode aumentar levemente o número de linhas de log em `judit_api_logs` (mais polls), mas continua dentro do limite. Custo Judit por chamada é o mesmo (a cobrança é pelo `request_id`, não por poll).
3. **Riscos colaterais**:
   - Função roda mais tempo (até 120 s). Edge functions Supabase têm limite de 150 s; ficamos folgados, mas é bom monitorar.
   - Se a Judit mudar o shape (`page_data` com mais itens), o novo loop continua compatível porque varre todos.
   - Tribunais que sempre devolvem `steps: []` (sigilo/erro de credencial) cairão no caminho "processo mínimo" como hoje.
4. **Quem é afetado**: todos os tenants que importam processos por CNJ via dialog "Importar processo". Beneficia em especial credenciais que destravam tribunais (caso atual da Solvenza com `alanpjero` no TJRO).

## Validação

- Reimportar o CNJ `7000047-89.2026.8.22.0021` na Solvenza com a credencial `alanpjero` → logs devem mostrar polling até `stepsLength > 0` e `andamentosInseridos > 0`.
- Importar um CNJ sigiloso (sem credencial casável) → cair no caminho "processo mínimo" com `dadosCompletos: false` e toast amigável (sem regressão).
- Conferir `judit_api_logs` da chamada: `request_id` único, `sucesso=true`, mesma `custo_estimado=1` (sem cobrança extra).
- Importar um CNJ que já existe → continuar retornando `duplicado: true` (caminho independente, não afetado).
