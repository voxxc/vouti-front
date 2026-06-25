## Causa raiz
1. Ao importar um CNJ com sufixo (ex.: `...0000/1.0000.24.414460-6/006`), o `ImportarProcessoCNJDialog` cria a linha em `processos_oab` com `apartado=true` **mas ainda chama** `escavador-importar-processo` (linha 168). Para apartado, essa chamada não deveria ocorrer.
2. No Resumo (`ProcessoOABDetalhes.tsx`), o apartado aparece como processo "solto": o card azul informa que é apartado, porém não há vínculo visual com o original (mesmo CNJ base, sem sufixo).
3. O card do **toggle de monitoramento** só renderiza quando `monitoramentoFeatureEnabled || processo.monitoramento_ativo || apartado` (linha 830). Em processos comuns/sigilosos, com a feature flag global do Escavador desligada, o toggle **some por completo** — o usuário não tem o controle visual para acompanhar manualmente.

## Correção
1. **Skip do Escavador no import de apartado** (`ImportarProcessoCNJDialog.tsx`, modos `single` e `bulk`): se `parsed.sufixoApartado` existir, pular a chamada `supabase.functions.invoke('escavador-importar-processo', ...)` e retornar sucesso direto após criar a linha em `processos_oab`.
2. **Branch CNJ no Resumo** (novo `ProcessoApartadoBranch.tsx`, montado no topo de `ProcessoOABDetalhes`): exibido sempre que houver outras linhas em `processos_oab` da mesma OAB compartilhando os 20 primeiros dígitos do CNJ. Layout:

```text
Processo principal
└─ 4092349-43.2025.8.13.0000              [atual]
   ├─ Apartado · /1.0000.24.414460-6/006   → clicável
   └─ Apartado · /2.0000.24.555555-5/007   → clicável
```

   - Query: `select id, numero_cnj, apartado from processos_oab where oab_id = ? and numero_cnj like '<base>%'`.
   - Linha do processo atual destacada (badge "atual"); demais clicáveis (trocam o processo no painel já aberto).
   - Se o processo atual é apartado e o original não existe como row, mostra o CNJ base como rótulo cinza não clicável.
3. **Card azul informativo de apartado**: mantido (texto já cobre "sem histórico antigo" + "monitoramento disponível e funcional").
4. **Toggle de monitoramento sempre visível** (`ProcessoOABDetalhes.tsx`, linha 830): remover o gate baseado em `monitoramentoFeatureEnabled`. O card do toggle passa a renderizar para **todos** os processos (normal, sigiloso, apartado). O comportamento do toggle continua respeitando a flag: para processos normais com flag desligada, ao tentar ativar mostra toast "Funcionalidade desativada pelo administrador" (já implementado nos hooks/edge functions); para sigiloso e apartado, segue ativando/desativando localmente (visual).

## Arquivos afetados
- `src/components/Controladoria/ImportarProcessoCNJDialog.tsx` — pular Escavador quando `apartado`.
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — renderizar `ProcessoApartadoBranch` no topo do Resumo; remover gate do card de toggle de monitoramento.
- `src/components/Controladoria/ProcessoApartadoBranch.tsx` — novo componente de árvore (busca irmãos + render).
- `src/components/Controladoria/OABTab.tsx` / `GeralTab.tsx` / `src/components/Project/ProjectProcessos.tsx` — propagar callback de troca de processo (`onSelecionarProcesso`) para o branch.

## Impacto
1. **Usuário final**: vê claramente a relação pai/filho entre original e apartados no Resumo e navega entre eles com um clique; importa apartado de forma instantânea (sem espera de 5–10s do Escavador); passa a enxergar o toggle de monitoramento em **todos** os processos, mesmo quando a integração Escavador está desligada globalmente — útil para acompanhamento puramente visual.
2. **Dados**: zero migrations. Apenas leitura adicional em `processos_oab` filtrando pelos 20 primeiros dígitos do CNJ (filtro escopado por `oab_id`, índice existente, custo desprezível). Nenhuma mudança em RLS, escrita ou no fluxo de monitoramento Escavador.
3. **Riscos colaterais**: baixos. Skip do Escavador para apartado é seguro pois os hooks já tratam apartado como visual-only. Sempre mostrar o toggle pode confundir usuários em tenants com flag desligada que tentarem ativar processos normais — mitigação: o toast atual já informa "Funcionalidade desativada pelo administrador".
4. **Quem é afetado**: todos os tenants da Controladoria/Projetos. Sem efeito em CRM, Agenda, Financeiro ou Super Admin.

## Validação
- Importar `4092349-43.2025.8.13.0000/1.0000.24.414460-6/006` → criação instantânea, sem request `escavador-importar-processo` no Network, branch aparece no Resumo do apartado.
- Importar depois `4092349-43.2025.8.13.0000` (puxa Escavador normalmente) → branch no Resumo do original mostra o apartado como filho clicável, e vice-versa.
- Com `escavador_monitoramento_enabled = false`, abrir um processo normal e confirmar que o card de toggle aparece; clicar para ativar mostra o toast de funcionalidade desativada e mantém o estado.
- Em apartado e sigiloso, o toggle ativa/desativa normalmente (visual) com a flag desligada.
- Processos sem irmãos não exibem o componente de branch (sem regressão visual).
