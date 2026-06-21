# Botão de Reparse no Detalhe do Processo

## Causa raiz
Quando uma importação do Escavador retorna dados nas `fontes[]` mas a edge function antiga gravou apenas o nível raiz, o resumo do caso fica com campos vazios (classe, assunto, juízo, partes, advogados). Hoje a única forma de corrigir é via curl manual à edge function `escavador-importar-processo` com `reparseSomente: true` — o usuário não consegue acionar isso pela UI.

## Correção
Adicionar um botão **"Reprocessar resumo"** na aba **Resumo** de `ProcessoOABDetalhes.tsx`, visível apenas quando:
- a feature flag `escavadorBeta` está ativa, **e**
- existe registro em `processo_monitoramento_escavador` para o processo (ou seja, já foi importado).

Comportamento:
1. Ao clicar, abre `AlertDialog` confirmando "Reprocessar usando dados em cache (sem nova cobrança)?".
2. Confirmando, chama `supabase.functions.invoke('escavador-importar-processo', { body: { processoId, numeroProcesso, reparseSomente: true } })`.
3. Sucesso → toast verde "Resumo reprocessado" + refetch do processo (`onUpdate?.()` ou `queryClient.invalidateQueries`) para recarregar `capa_completa`, `parte_ativa`, `parte_passiva`, `juizo`, `fase_processual`.
4. Erro → toast destrutivo com a mensagem.

Posicionamento: ao lado do botão "Editar Resumo" no header da aba (linha ~946 em diante), com ícone `RefreshCw` e estado de loading.

## Arquivos afetados
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — adicionar estado `reprocessandoResumo`, handler `handleReprocessarResumo`, botão e `AlertDialog` de confirmação.

Sem migrations, sem alterações em edge functions (a função já suporta `reparseSomente: true` desde o último ajuste), sem alterações de RLS.

## Impacto
1. **UX**: usuários da Controladoria ganham um botão self-service na aba Resumo para reprocessar casos com resumo incompleto, sem precisar abrir ticket. Confirmação evita cliques acidentais.
2. **Dados**: nenhuma mudança de schema. O reparse lê `processo_monitoramento_escavador.escavador_data` (cache) e regrava `processos`, `processos_oab`, `processo_monitoramento_escavador` — operação idempotente.
3. **Riscos colaterais**: 
   - Sem cobrança da API Escavador (não chama API externa no modo `reparseSomente`).
   - Se o cache estiver vazio/corrompido a função retorna erro claro — tratado com toast.
   - Como sobrescreve campos já preenchidos manualmente em "Editar Resumo", o `AlertDialog` precisa avisar: "edições manuais nos campos do resumo serão sobrescritas pelos dados do Escavador".
4. **Quem é afetado**: somente tenants com flag `escavadorBeta`; dentro deles, qualquer usuário com acesso ao processo (admin, controller, advogado responsável).

## Validação
1. Abrir o processo `0123417-95.2025.8.16.0000` (já reprocessado via curl) → botão aparece.
2. Clicar, confirmar → toast de sucesso, campos do resumo permanecem populados.
3. Abrir um processo importado mas com resumo incompleto → reprocessar → verificar `parte_ativa`, `parte_passiva`, `juizo`, `fase_processual`, `advogados_partes` populados.
4. Abrir um processo nunca importado → botão não aparece.
5. Tenant sem flag `escavadorBeta` → botão não aparece.
