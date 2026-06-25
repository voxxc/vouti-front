## Causa raiz
Hoje só o conteúdo da aba Resumo (dentro do `ScrollArea`) rola. O cabeçalho com CNJ + badges, os alertas (sigiloso/apartado), o branch e o card de monitoramento ficam fixos acima das tabs, então quando o usuário entra na aba Resumo só sobra uma faixa pequena rolando — visualmente quebrado.

## Correção
Tornar todo o conteúdo abaixo do cabeçalho rolável de uma vez, deixando fixo apenas o bloco do nome do processo no topo.

Em `src/components/Controladoria/ProcessoOABDetalhes.tsx`:

1. Manter fixo apenas o card `Cabeçalho com Número + Valor + Badges` (linhas 738–766).
2. Envolver tudo abaixo (alertas Sigiloso/Apartado, `ProcessoApartadoBranch`, alerta "Em processamento", Card de Monitoramento + credencial Judit, e o bloco `<Tabs>`) em um único container scrollável: `<div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">`.
3. Remover os `ScrollArea` internos das `TabsContent` (resumo, andamentos, intimações, partes, prazos, tarefas) e os `flex-1 min-h-0` das tabs — agora o scroll é externo, então o conteúdo de cada aba flui naturalmente dentro do scroll global.
4. Os `AlertDialog` ficam fora do container scroll (são portais, sem impacto visual).
5. Remover `sticky top-0` dos cabeçalhos internos das abas (Resumo/Partes), pois deixariam de funcionar dentro do scroll global e ficariam estranhos.

Resultado: ao abrir o drawer, o usuário vê o CNJ sempre fixo no topo; a partir do alerta de segredo de justiça tudo rola junto — alertas, branch, toggle de monitoramento e as tabs com seu conteúdo.

## Arquivos afetados
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` (única mudança — apenas layout/wrapper, sem tocar em lógica).

## Impacto
1. **UX**: rolagem única e contínua no drawer; fim da "janelinha" pequena dentro da aba Resumo. Header com CNJ permanece sempre visível.
2. **Dados**: nenhum — mudança puramente de apresentação.
3. **Riscos colaterais**: as outras abas (Andamentos, Intimações, Partes, Prazos, Tarefas) passam a rolar junto com o header dos cards de monitoramento — ou seja, o toggle de monitoramento "sobe" junto. Isso é coerente com o pedido (top fixo é só o nome do processo). Pequenos cabeçalhos `sticky` internos das abas deixam de "grudar".
4. **Quem é afetado**: todos os usuários que abrem o drawer de detalhes do processo na Controladoria e no Super Admin (se reutilizar o mesmo componente).

## Validação
- Abrir um processo sigiloso e um apartado: confirmar que só o card do CNJ fica fixo e o restante rola.
- Trocar entre as tabs e rolar: conteúdo flui sem barras duplas.
- Verificar em viewport pequeno (mobile) que o scroll continua único.