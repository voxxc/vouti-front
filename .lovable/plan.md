## Causa raiz

Hoje quando o V2 do Escavador devolve 404 e o V1 (`/informacoes-no-tribunal`) também recusa (ex.: "processo não disponível para consulta"), a função `escavador-importar-processo` aborta e nada é gravado em `processos_oab`. Resultado: o usuário não consegue nem cadastrar o CNJ, mesmo sabendo que ele existe.

A regra correta é: sempre criar o registro local do processo. A indisponibilidade de andamentos é só uma condição transitória do provedor — não deve impedir o cadastro nem o monitoramento.

## Correção

1. Em `supabase/functions/escavador-importar-processo/index.ts`:
   - Quando V2 retornar 404 e V1 falhar (ou responder que o processo não está disponível), **não lançar erro**. Em vez disso:
     - Fazer upsert mínimo em `processos_oab` (numero_cnj, oab_id/tenant_id, `detalhes_carregados=false`, `capa_completa=null`).
     - Gravar `processo_monitoramento_escavador` com `escavador_data = { status: 'aguardando_disponibilidade', solicitado_em: now, ultimo_erro: <mensagem> }` e `monitoramento_ativo=false`.
     - Retornar `success: true` com `message: "Processo cadastrado. Os andamentos ainda estão sendo processados pelos tribunais e ficarão disponíveis em breve. O monitoramento já pode ser ativado."` e uma flag `aguardando_disponibilidade: true`.
   - Remover qualquer menção a "Escavador" das mensagens de retorno.

2. Em `src/components/Controladoria/ProcessoOABDetalhes.tsx` (aba Resumo):
   - Detectar quando `processo_monitoramento_escavador.escavador_data.status` é `coleta_solicitada` ou `aguardando_disponibilidade` (ou quando `detalhes_carregados=false` e não há andamentos).
   - Renderizar um `Alert` informativo logo abaixo do alerta de sigilo/apartado: "Este processo ainda está em processamento para disponibilizar o histórico de andamentos. Você já pode ativar o monitoramento — novos andamentos serão exibidos automaticamente assim que ficarem disponíveis."
   - Manter o toggle de monitoramento habilitado normalmente (já é tratado pelo `useToggleMonitoramento` com fallback visual quando preciso).

3. Em `src/components/Controladoria/ImportarProcessoCNJDialog.tsx` (ou equivalente):
   - Quando a resposta vier com `aguardando_disponibilidade: true`, exibir toast informativo (não erro) e abrir o processo recém-criado normalmente.

## Arquivos afetados

- `supabase/functions/escavador-importar-processo/index.ts`
- `src/components/Controladoria/ProcessoOABDetalhes.tsx`
- `src/components/Controladoria/ImportarProcessoCNJDialog.tsx`

## Impacto

- **Usuário final**: nunca mais leva erro "processo indisponível" ao importar. O processo entra no sistema, aparece o aviso de "em processamento" no Resumo e o monitoramento pode ser ativado imediatamente.
- **Dados**: novos registros `processos_oab` podem ficar sem `capa_completa` até o webhook do tribunal chegar. `processo_monitoramento_escavador` ganha um novo valor de status (`aguardando_disponibilidade`) — sem migration; é só JSON.
- **Riscos colaterais**: possibilidade de cadastrar CNJs digitados errados (já que não há mais bloqueio por 404). Mitigado pela validação de máscara CNJ já existente no diálogo de importação.
- **Afetados**: todos os usuários que importam processos novos ou ainda não indexados (em especial Solvenza/Izabelita).

## Validação

1. Reimportar `5001038-07.2026.8.21.0093` e confirmar que o processo é criado e abre com o alerta "em processamento" no Resumo.
2. Ativar o monitoramento desse processo e verificar que o toggle persiste (mesmo em modo visual).
3. Importar um CNJ inválido digitado errado e confirmar que ainda assim entra (comportamento aceito) — e remover manualmente se for o caso.
4. Importar um CNJ já existente no V2 para garantir que o fluxo normal segue funcionando sem o alerta.
