## Monitoramento "visual" para processos sigilosos

### Causa raiz
Hoje, ao ativar o toggle de monitoramento em qualquer processo, o hook `useOABs.toggleMonitoramento` chama a edge function `escavador-ativar-monitoramento-oab`, que registra o processo no Escavador. Em processos sigilosos isso é indesejado: o usuário só precisa ver o monitoramento como ativo (visualmente), enquanto a alimentação será feita manualmente pelo administrador "em segredo". Para processos comuns, o comportamento atual (Escavador semanal) deve continuar.

### Correção
1. Criar helper compartilhado `isProcessoSigiloso(processo)` em `src/utils/processoOABHelpers.ts`, replicando a lógica já existente em `ProcessoOABDetalhes.tsx` (regex em `parte_ativa`/`parte_passiva` + `capa.secrecy_level >= 1` + `capa.justice_secret`). Refatorar `ProcessoOABDetalhes.tsx` para usar esse helper.

2. Em `src/hooks/useOABs.ts`, dentro de `toggleMonitoramento`:
   - Aceitar um parâmetro extra opcional `sigiloso?: boolean` (último argumento, sem quebrar callers).
   - Se `sigiloso === true`:
     - **Ativar:** NÃO chamar `escavador-ativar-monitoramento-oab`. Fazer um simples `UPDATE processos_oab SET monitoramento_ativo = true WHERE id = processoId AND tenant_id = tenantId`. Toast: "Monitoramento ativado — atualizações serão registradas manualmente".
     - **Desativar:** NÃO chamar `escavador-desativar-monitoramento-oab` nem `judit-desativar-monitoramento`. Apenas `UPDATE ... SET monitoramento_ativo = false`. Toast: "Monitoramento desativado".
   - Se `sigiloso !== true`: manter exatamente o fluxo atual (Escavador + cleanup Judit).

3. Em `src/components/Controladoria/OABTab.tsx` e `GeralTab.tsx`, ao chamar `handleToggleMonitoramento`, passar `isProcessoSigiloso(processo)` como último argumento.

4. Verificar que o aviso de "Processo em Segredo de Justiça" em `ProcessoOABDetalhes.tsx` continua condicionado a `!processo.monitoramento_ativo` (já implementado), de forma que o aviso some assim que o toggle é ativado, mesmo no caminho sigiloso.

### Arquivos afetados
- `src/utils/processoOABHelpers.ts` — novo helper `isProcessoSigiloso`.
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — usar helper compartilhado.
- `src/hooks/useOABs.ts` — bifurcação no `toggleMonitoramento`.
- `src/components/Controladoria/OABTab.tsx` — passar flag sigiloso.
- `src/components/Controladoria/GeralTab.tsx` — passar flag sigiloso.

### Impacto
- **UX / telas / fluxos:**
  - Processos sigilosos: ao clicar no toggle, o processo passa a aparecer como "Monitoramento ativo" sem chamar nenhuma API externa. O aviso amarelo de sigilo desaparece. O usuário não percebe diferença visual em relação ao fluxo normal.
  - Processos comuns: comportamento inalterado — toggle continua acionando Escavador semanal.
- **Dados / migrations / RLS / performance:** Sem migrações, sem mudança em RLS. Apenas um `UPDATE` direto em `processos_oab` (já permitido pelas policies existentes que permitem o usuário do tenant atualizar seus processos). Reduz custo: nenhuma chamada Escavador para sigilosos.
- **Riscos colaterais:**
  - Se a detecção de sigiloso falhar (falso negativo), o processo entrará no Escavador como antes — comportamento atual, sem regressão.
  - Se houver falso positivo (processo comum classificado como sigiloso pela regex), o monitoramento Escavador NÃO será acionado e o usuário verá o toggle "ativo" sem efeito real. Mitigação: a regex já é restritiva (match completo da string) e replica o critério usado para mostrar o badge "Sigiloso", então o usuário sempre verá o badge nesse caso.
  - Em processos sigilosos que já tinham um `tracking_id` (vindo de fluxo anterior), a desativação pelo caminho novo não chama a edge function de cleanup. Como o usuário deseja apenas controle visual a partir de agora, isso é aceitável; se necessário, o admin pode desativar manualmente pelo painel super-admin.
- **Quem é afetado:** Todos os tenants que possuem processos sigilosos no módulo Controladoria/OAB. Admins que cadastram andamentos manualmente continuam com o fluxo deles inalterado.

### Validação
1. Em um processo com `parte_ativa = "Sigilo"`: ativar o toggle → confirmar via DevTools/Network que **nenhuma** chamada para `escavador-ativar-monitoramento-oab` é disparada, o toggle fica ativo, o aviso some.
2. No mesmo processo, desativar → confirmar que nenhuma chamada Escavador/Judit é feita, toggle volta a inativo, aviso reaparece.
3. Em um processo comum (não sigiloso): ativar/desativar → confirmar que `escavador-ativar-monitoramento-oab` e `escavador-desativar-monitoramento-oab` continuam sendo chamadas como hoje.
4. Recarregar a página e verificar que o estado `monitoramento_ativo` persiste corretamente em ambos os casos.