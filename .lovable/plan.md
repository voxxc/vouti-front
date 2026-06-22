## Ampliar detecção de "sigiloso" para processos sem partes/andamentos

### Causa raiz
A detecção atual de processo sigiloso (`isProcessoSigiloso` em `src/utils/processoOABHelpers.ts`) considera apenas:
- `secrecy_level >= 1` ou `justice_secret === true` na capa Judit;
- partes mascaradas com termos como "Sigilo", "Segredo de justiça".

O processo `0035150-55.2023.8.16.0021` (registro `045ff3ae-282d-4c39-b724-da3d355a82cf`) veio com `secrecy_level = NULL`, `justice_secret = NULL`, `parte_ativa = NULL`, `parte_passiva = NULL` e nenhum andamento — sinais práticos de sigilo, mas que escapam à regra atual. O usuário quer que processos nesse formato também recebam o aviso amarelo e o tratamento "monitoramento visual".

### Correção
Ampliar `isProcessoSigiloso` em `src/utils/processoOABHelpers.ts` para considerar **também sigiloso** quando, na ausência das flags explícitas, o processo apresentar TODAS as condições abaixo (heurística "capa cega"):

1. `parte_ativa` vazio/nulo/whitespace **E** `parte_passiva` vazio/nulo/whitespace (após `trim`), considerando tanto o nível raiz quanto `judit_data.lawsuit.parte_ativa/parte_passiva` se existir;
2. `partes_completas` vazio/nulo (ou array de tamanho 0);
3. nenhum `step`/andamento na capa (`judit_data.lawsuit.steps` vazio ou ausente).

A combinação das três é forte o suficiente para evitar falso positivo em processos recém-distribuídos (que normalmente têm pelo menos as partes) e em processos comuns com capa parcial (que costumam trazer ao menos `partes_completas`).

Como o helper hoje recebe apenas `processo`, vou usar `processo.partes_completas` e `processo.judit_data?.lawsuit?.steps`/`processo.capa_completa?.steps` (o que existir) para essa checagem. A lógica fica encapsulada em uma função interna `temCapaCega(processo)`.

Nada muda no `ProcessoOABDetalhes.tsx`, `OABTab.tsx`, `GeralTab.tsx` ou `useOABs.ts` — todos consomem o helper, então o novo critério se propaga automaticamente para:
- exibição do badge "Sigiloso";
- exibição do card de aviso amarelo;
- bypass do Escavador no toggle de monitoramento.

### Arquivos afetados
- `src/utils/processoOABHelpers.ts` — único arquivo alterado.

### Impacto
- **UX / telas / fluxos:**
  - Processos com capa cega (sem partes, sem andamentos) passarão a exibir o badge "Sigiloso" e o card amarelo de aviso.
  - O toggle de monitoramento, quando ativado nesses casos, será apenas visual (já implementado), e o aviso some.
  - Para o caso `0035150-55.2023.8.16.0021` (registro com 1 andamento e partes nulas), o segundo registro será classificado como sigiloso; o primeiro registro do mesmo CNJ (com 93 andamentos e partes preenchidas, mesmo que estranhas) **não** será afetado, pois falha na condição 3.
- **Dados / migrations / RLS / performance:** Nenhuma mudança em DB, RLS, migrations ou edge functions. Apenas lógica frontend.
- **Riscos colaterais:**
  - Falso positivo em processos novíssimos onde a Judit ainda não devolveu partes nem andamentos. Mitigação: a heurística exige as três condições simultâneas; quando a Judit completar a sincronização, a classificação volta ao normal.
  - Caso o usuário ative o monitoramento em um falso positivo, ficará no modo "visual" sem Escavador. Para esse cenário, basta desativar e reativar quando os dados retornarem para reentrar no fluxo Escavador.
- **Quem é afetado:** Todos os tenants no módulo Controladoria/OAB que tenham processos com capa cega.

### Validação
1. Recarregar a tela de detalhes do registro `045ff3ae-282d-4c39-b724-da3d355a82cf` (CNJ `0035150-55.2023.8.16.0021`) e confirmar que o badge "Sigiloso" e o card de aviso aparecem.
2. Ativar o monitoramento e verificar (DevTools → Network) que **nenhuma** chamada para `escavador-ativar-monitoramento-oab` é disparada; o aviso desaparece.
3. Desativar e confirmar que o aviso volta, sem chamadas Escavador.
4. Abrir um processo comum (com partes e andamentos) e confirmar que o badge não aparece e o toggle continua acionando o Escavador normalmente.