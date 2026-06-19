# Por que não há andamentos no processo 7000047-89.2026.8.22.0021

## Diagnóstico (com base nos dados reais)

- O processo foi criado em `processos_oab` no dia 19/06 às 18:06 (id `13a9f104-b4aa-4078-8387-77f0d74c4bb9`).
- `judit_api_logs` mostra **uma única chamada** à Judit, `request_id c464e113-2b60-49f6-9edd-cc3614bc0990`, status 200, sucesso true, custo 1, com `with_attachments` ainda **fora** da raiz (versão antiga do código).
- `processos_oab_andamentos` para esse processo: **0 linhas**.
- Não existe job em `processo_import_jobs` (foi importação direta, não via worker), então não há retry automático.
- Conclusão: a Judit respondeu rápido com a **capa** apenas (sem `steps`); o loop de polling antigo saiu na primeira página com `page_data > 0` e não esperou os andamentos chegarem. Foi exatamente o bug que a correção em `judit-buscar-processo-cnj` endereça — só que a correção foi publicada **depois** desse import, então este processo específico continua sem andamentos.

## Correção proposta

Não é bug pendente no código — o polling já está corrigido. O que falta é **reprocessar este CNJ** (e dar uma forma manual para casos futuros).

### 1. Reprocessar o CNJ 7000047 agora
Disparar `judit-buscar-processo-cnj` novamente para esse CNJ no tenant Solvenza com a credencial `alanpjero`, indicando o `processo_oab_id` existente para que os andamentos sejam anexados ao registro `13a9f104-b4aa-4078-8387-77f0d74c4bb9` (sem criar duplicata). Esperado: a chamada nova vai pollar até `steps.length > 0` e popular `processos_oab_andamentos`.

### 2. Botão "Re-buscar andamentos" no resumo do processo (OAB)
Em `ProcessoOABDetalhes.tsx`, ao lado do botão de monitoramento Judit já existente, adicionar um botão `Re-buscar andamentos (Judit)` visível para admin/controller. Ele chama `judit-buscar-processo-cnj` com `{ numero_cnj, credencial_id, processo_oab_id_existente }` e mostra toast de progresso/sucesso.

### 3. Ajuste leve no edge function
`judit-buscar-processo-cnj` precisa aceitar `processo_oab_id_existente` no body: se vier, **não cria** processo novo, só faz upsert dos andamentos no processo informado (deduplicando por `dedup_hash`).

## Arquivos afetados

- `supabase/functions/judit-buscar-processo-cnj/index.ts` — aceitar `processo_oab_id_existente` e pular criação quando presente.
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — botão "Re-buscar andamentos (Judit)" (admin/controller).
- Sem migration. Sem novas tabelas. Sem novas secrets.

## Impacto

1. **Usuário final**: Daniel (e qualquer admin/controller) ganha um botão para re-buscar andamentos sob demanda quando a Judit demorar a devolver `steps` ou quando um import antigo tiver ficado sem movimentações. UX: clique → toast "Buscando..." → toast "X andamentos importados".
2. **Dados**: nenhum schema novo. Apenas inserts em `processos_oab_andamentos` com dedup por `dedup_hash` — sem risco de duplicata. `judit_api_logs` ganha um registro novo (custo 1 por chamada Judit).
3. **Riscos colaterais**: cada clique no botão consome 1 crédito Judit. Mitigado por limitar a admin/controller e adicionar `disabled` durante a chamada.
4. **Quem é afetado**: somente perfis admin/controller no tenant. Demais usuários não veem o botão.

## Validação

- Após implementar, clicar no botão no processo 7000047-89.2026.8.22.0021 → conferir que `processos_oab_andamentos` deixa de ter 0 linhas e que a aba de andamentos no resumo passa a listá-los.
- Conferir `judit_api_logs`: novo registro com `tipo_chamada=lawsuit_cnj_refresh`, sucesso true, andamentos > 0.
- Tentar clicar duas vezes seguidas → sem duplicatas (dedup_hash).
