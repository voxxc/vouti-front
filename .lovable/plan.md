## Causa raiz

- Confirmei pelos logs: não houve chamada recente para `escavador-importar-processo`.
- O CNJ `0123417-95.2025.8.16.0000` já existe em `processos`, mas com `tenant_id` nulo e sem capa útil (`classe`/`tribunal` nulos) nem andamentos.
- A regra atual trata `escavador_id` sozinho como “capa completa”; por isso, ao tentar importar de novo, o frontend entende que já está completo e não chama o Escavador.
- Além disso, a tela onde você pesquisou lista `processos_oab`, enquanto o importador manual por CNJ está gravando/buscando em `processos`. Mesmo quando grava, pode não aparecer nessa aba.

## Correção

1. Corrigir a regra de “dados completos”.
   - Não considerar `escavador_id` sozinho como processo completo.
   - Só bloquear nova consulta se houver capa útil, por exemplo `classe`, `tribunal`, `assunto` ou andamentos carregados.
   - Se existir apenas `escavador_id` sem dados, chamar o Escavador novamente.

2. Corrigir o destino da importação por CNJ dentro da aba OAB.
   - O botão “Importar Processo por CNJ” deve criar/reaproveitar registro em `processos_oab`, pois essa é a tabela exibida nessa tela.
   - Usar duplicidade por `oab_id + numero_cnj`, não por `processos.numero_processo` global.
   - Preencher `tenant_id`, `oab_id`, `numero_cnj`, `tribunal_sigla`, `importado_manualmente`, `importado_por`, credencial Judit selecionada e flags de apartado.

3. Disparar a consulta correta após criar/reaproveitar.
   - Para a aba OAB, acionar o fluxo que popula detalhes/andamentos de `processos_oab`.
   - Se o fluxo OAB ainda depender de Judit, manter isso isolado; não deixar a chamada ao Escavador genérico bloquear a visibilidade na aba OAB.
   - Atualizar a lista via `onSuccess`/`fetchProcessos` ao final.

4. Corrigir o caso já quebrado.
   - Inserir/vincular `0123417-95.2025.8.16.0000` em `processos_oab` para a OAB/tenant correto, sem apagar o registro antigo em `processos`.
   - Garantir que ele apareça na busca da aba OAB após a correção.

## Arquivos afetados

- `src/components/Controladoria/ImportarProcessoCNJDialog.tsx`
  - Corrigir duplicidade, tabela-alvo e atualização pós-importação.
- Possivelmente `src/hooks/useOABs.ts`
  - Reaproveitar ou expor uma função de recarregamento/consulta de detalhes para `processos_oab`.
- Banco de dados
  - Sem migration prevista.
  - Pode haver apenas correção pontual de dados do CNJ já testado.

## Impacto

1. Usuário final
   - Ao importar CNJ pela aba OAB, o processo passa a aparecer na própria lista/pesquisa da OAB.
   - Se o processo já existir mas estiver incompleto, ele será reconsultado em vez de “não acontecer nada”.
   - O toast passa a refletir o estado real: importado, atualizado, já completo ou erro.

2. Dados
   - Novos imports manuais por CNJ serão gravados em `processos_oab` com `tenant_id` preenchido.
   - Não há mudança estrutural, migration ou alteração de RLS prevista.
   - O registro antigo em `processos` com `tenant_id` nulo deixa de bloquear o fluxo da aba OAB.

3. Riscos colaterais
   - Baixo risco, limitado ao botão “Importar Processo por CNJ” na aba OAB.
   - Reconsultar processo incompleto pode consumir nova requisição/crédito no provedor usado pelo fluxo de detalhes.
   - Precisa preservar o importador separado de processos gerais (`ImportarProcessoDialog.tsx`).

4. Quem é afetado
   - Usuários que importam CNJ manualmente pela aba OAB na Controladoria.
   - Admins/controladoria/advogados que visualizam processos por OAB.
   - Todos os tenants que usam esse fluxo, com reforço do isolamento por `tenant_id`.

## Validação

- Reimportar `0123417-95.2025.8.16.0000` pela mesma aba OAB.
- Confirmar que uma requisição de consulta é disparada quando o processo está incompleto.
- Confirmar que o processo aparece na lista/pesquisa da OAB.
- Confirmar no banco que existe em `processos_oab` com `tenant_id` e `oab_id` corretos.
- Importar novamente o mesmo CNJ e confirmar que não cria duplicado nem falha silenciosamente.