# Migração da importação de processo: Judit → Escavador

## Causa raiz
Hoje o `ImportarProcessoDialog` chama duas Edge Functions Judit:
- `judit-ativar-monitoramento` (quando o checkbox é marcado)
- `judit-buscar-detalhes-processo` (sempre, em background, para preencher capa + andamentos)

Você quer que daqui para frente a importação use **somente Escavador**, mantendo o comportamento atual de preencher os dados retornados (capa + andamentos) e o monitoramento opcional via checkbox.

## Correção

1. **Criar nova Edge Function `escavador-importar-processo`** (espelho da `judit-buscar-detalhes-processo`, mas usando a API Escavador):
   - Recebe: `{ processoOabId, numeroCnj, tenantId, userId, ativarMonitoramento }`
   - Consulta a API Escavador (`GET /api/v1/busca` + `GET /api/v1/processos/{id}` quando necessário) para obter capa do processo (classe, assunto, área, tribunal, data distribuição, valor causa, partes, advogados) e movimentações.
   - Insere as movimentações em `processo_atualizacoes_escavador` (mesma tabela que o `escavador-ativar-e-buscar` já usa) com `tipo_atualizacao = 'importacao_inicial'`.
   - Faz `upsert` em `processo_monitoramento_escavador` com os dados da capa (`classe`, `assunto`, `area`, `tribunal`, `data_distribuicao`, `valor_causa`, `escavador_id`, `escavador_data`).
   - Se `ativarMonitoramento === true`: registra monitoramento Escavador (chama `POST /api/v1/monitoramento-tribunal` com `frequencia=SEMANAL` e seta `monitoramento_ativo = true`). Caso contrário: deixa `monitoramento_ativo = false`.
   - Retorna `{ success, andamentosInseridos, capa: { classe, assunto, ... } }` para o front exibir o toast — mesmo formato consumido hoje.

2. **Atualizar `ImportarProcessoDialog.tsx`**:
   - Remover as duas chamadas a `supabase.functions.invoke('judit-…')`.
   - Após criar o registro em `processos`, disparar **uma única** chamada em background para `escavador-importar-processo` passando `ativarMonitoramento` (estado do checkbox).
   - Manter checkbox como `useState(false)` (já está assim) e a lógica de `limiteMonitoramentoAtingido`.
   - Manter os toasts ("Processo importado!", "📋 Andamentos carregados", etc.) com base no retorno.

3. **Manter intactas todas as funções Judit** (`judit-buscar-detalhes-processo`, `judit-ativar-monitoramento`, etc.) — apenas deixam de ser chamadas pelo botão de importar. Ficam disponíveis para fluxos legados (drawer do processo, monitoramento manual antigo, etc.) sem alterações.

## Arquivos afetados
- **Novo:** `supabase/functions/escavador-importar-processo/index.ts`
- **Editado:** `src/components/Controladoria/ImportarProcessoDialog.tsx`
- **Não tocados:** todas as funções `judit-*` e `escavador-ativar-e-buscar` (preservadas).

## Impacto

**Usuário final (UX/fluxos):**
- Botão "Importar Processo" passa a usar Escavador. UX igual: dialog, checkbox de monitoramento (default desmarcado), toasts de progresso, redirecionamento para detalhes do processo.
- Capa e andamentos continuam sendo preenchidos automaticamente em background.
- Monitoramento só é ativado se o usuário marcar o checkbox — sem cobranças inesperadas em testes.

**Dados:**
- Sem migrations. Reutiliza tabelas já existentes (`processo_monitoramento_escavador`, `processo_atualizacoes_escavador`).
- Processos novos não criam mais linhas em `processo_monitoramento_judit` nem `tracking_id` Judit pelo fluxo de importação.
- Cobertura/cobrança passa do contrato Judit para o contrato Escavador.

**Riscos colaterais:**
- Processos novos não terão `tracking_id` Judit; qualquer tela/relatório que dependa desse campo continuará funcionando para os processos antigos, mas mostrará vazio para os novos. Sem impacto em RLS.
- Se a Escavador não encontrar o processo (cobertura menor que Judit em alguns tribunais), a capa fica vazia e o usuário precisará tentar novamente. Tratado com toast de aviso.
- Funções Judit ficam ociosas no fluxo de importação, mas continuam ativas para outros pontos do sistema (drawer, OAB, CNPJ).

**Quem é afetado:**
- Todos os tenants que usam o botão "Importar Processo" da Controladoria. Demais fluxos (Push-docs, OAB, CNPJ, monitoramento manual existente) ficam inalterados.

## Validação
1. Abrir dialog: checkbox de monitoramento começa desmarcado.
2. Importar sem marcar: processo é criado, capa e andamentos aparecem nos detalhes em segundos, **nenhum** registro de monitoramento ativo é criado.
3. Importar marcando o checkbox: idem acima + linha em `processo_monitoramento_escavador` com `monitoramento_ativo=true`.
4. Conferir logs da nova função no painel Supabase.
5. Confirmar que nenhuma chamada para `judit-buscar-detalhes-processo` ou `judit-ativar-monitoramento` aparece no Network ao importar.
