
## Diagnóstico: por que ainda persiste no tenant Cordeiro

Achei a causa real no fluxo atual.

### Causa raiz
O ajuste anterior foi feito nas functions erradas para o fluxo OAB que está sendo usado no app.

Hoje, no módulo de processos OAB, o sistema usa principalmente:

- `judit-ativar-monitoramento-oab`
- `judit-buscar-detalhes-processo`
- `judit-buscar-processo-cnj`

E o problema continua por 2 motivos:

1. `judit-ativar-monitoramento-oab` ainda cria tracking sem `credential`
   - O arquivo atual monta `trackingPayload` só com:
     - `recurrence`
     - `search`
     - `callback_url`
   - Não busca `credenciais_judit`
   - Não envia `credential: { customer_key }`
   - Resultado: o tracking nasce “cego” para processo sigiloso

2. `judit-buscar-detalhes-processo` reaproveita `detalhes_request_id` antigo
   - Antes de fazer nova consulta, ele tenta usar:
     - `detalhes_request_id` de outro processo com mesmo CNJ
     - ou `request_id` vindo do `tracking_id`
   - Se esse request antigo foi criado sem credencial, ele continua retornando dados incompletos
   - Ou seja: mesmo com credencial válida hoje, o sistema recicla um request “contaminado” do passado

### Evidência no código
- `src/hooks/useOABs.ts` e `src/components/Project/ProjectProcessos.tsx` chamam `judit-ativar-monitoramento-oab`
- `supabase/functions/judit-ativar-monitoramento-oab/index.ts` não injeta `customer_key`
- `supabase/functions/judit-buscar-detalhes-processo/index.ts` usa `detalhes_request_id` existente antes de forçar nova consulta autenticada
- `supabase/functions/judit-buscar-processo-cnj/index.ts` já envia credencial, mas escolhe apenas a primeira credencial ativa, sem casar tribunal/sistema

### O que corrigir
1. Corrigir `judit-ativar-monitoramento-oab`
   - Buscar credencial ativa do tenant
   - Preferir credencial compatível com o tribunal do CNJ
   - Incluir `credential: { customer_key }` no POST `/tracking`
   - Se estiver reativando tracking antigo com `/resume`, avaliar recriar tracking quando o processo for sigiloso e o tracking original não tiver sido criado com credencial

2. Corrigir `judit-buscar-detalhes-processo`
   - Não reaproveitar automaticamente `detalhes_request_id` antigo em processo sigiloso
   - Se o processo estiver com sinais de sigilo/incompleto (ex.: sem partes, sem andamentos relevantes, parte_ativa genérica), forçar nova consulta com credencial
   - Opcionalmente ignorar também `request_id` vindo de tracking antigo sem credencial

3. Melhorar seleção de credencial
   - Hoje o código tende a pegar a primeira credencial ativa
   - Precisamos casar por tribunal/sistema usando o CNJ
   - Ex.: TJPR -> credencial `rodrigotjpr`, TRF4 -> `rodrigotrf4`, Projudi -> `rodrigoprojudi` quando fizer sentido

4. Reprocessamento dos processos já afetados
   - Mesmo após o fix, processos antigos continuarão com `detalhes_request_id` ruim até serem recarregados
   - Precisamos ajustar a lógica para “furar cache ruim” e depois acionar atualização manual/automática dos casos do Cordeiro

### Implementação proposta
**Arquivos a editar**
- `supabase/functions/judit-ativar-monitoramento-oab/index.ts`
- `supabase/functions/judit-buscar-detalhes-processo/index.ts`
- `supabase/functions/judit-buscar-processo-cnj/index.ts`

### Resultado esperado
Depois da correção:
- novos trackings OAB serão criados com credencial
- consultas de detalhes deixarão de reaproveitar request antigo inválido para casos sigilosos
- processos sigilosos do tenant Cordeiro passarão a preencher partes, detalhes e andamentos quando a credencial realmente tiver acesso

### Detalhes técnicos
```text
Fluxo atual com falha:
UI OAB -> judit-ativar-monitoramento-oab -> tracking sem credential
UI detalhes -> judit-buscar-detalhes-processo -> reutiliza request_id antigo -> resposta incompleta

Fluxo corrigido:
UI OAB -> judit-ativar-monitoramento-oab -> tracking com credential
UI detalhes -> se detectar sigilo/cache ruim -> POST novo com credential
```
