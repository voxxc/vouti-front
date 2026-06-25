## Causa raiz
O `ScrollArea` da aba **Resumo** em `src/components/Controladoria/ProcessoOABDetalhes.tsx` (linha 1124) usa altura fixa `h-[calc(100vh-420px)]`. O cabeçalho do drawer agora cresceu (alerta de Sigiloso + alerta de Apartado + card "Estrutura do processo" + card de Monitoramento), empurrando o ScrollArea para baixo da viewport. Como o `SheetContent` está com `overflow-visible` e o calc não acompanha a altura real do cabeçalho, o conteúdo do Resumo é cortado/some no fim da tela sem scroll.

## Correção
Tornar o layout do `SheetContent` baseado em flex para que a área de tabs ocupe o espaço restante dinamicamente:

1. Converter o wrapper `<div className="mt-4 space-y-4">` (linha 736) em `flex flex-col` com altura limitada (`h-[calc(100vh-7rem)]` ou similar baseado no `SheetHeader`).
2. Separar o cabeçalho dinâmico (CNJ box, alertas, branch, monitoramento) num bloco `shrink-0` que rola junto se necessário (`overflow-y-auto`) — ou mantê-lo fixo e deixar só a tab rolar.
3. O container `<Tabs>` recebe `flex-1 min-h-0 flex flex-col`, e cada `TabsContent` (Resumo, Andamentos, etc.) recebe `flex-1 min-h-0`.
4. Substituir as alturas calc dos `ScrollArea` por `h-full` para que se ajustem ao container flex.

Abordagem mais conservadora alternativa (caso prefira menor blast radius): apenas trocar o `ScrollArea h-[calc(100vh-420px)]` do Resumo por `h-[calc(100vh-560px)]` para acomodar o cabeçalho atual. Porém isso quebra de novo se o cabeçalho mudar — recomendado o flex.

## Arquivos afetados
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — ajuste de layout no `SheetContent`, wrapper principal, container `<Tabs>` e classes dos `ScrollArea` das abas Resumo, Andamentos, Partes, Intimações.

## Impacto
1. **Usuário final:** o conteúdo do Resumo (Localização, Situação Atual, Automação de Prazos etc.) volta a ser rolável independentemente do tamanho do cabeçalho. Comportamento idêntico em qualquer combinação de alertas (sigiloso/apartado/normal). Demais abas continuam com seus scrolls.
2. **Dados:** nenhuma alteração. Sem migrations, RLS ou queries.
3. **Riscos colaterais:** mudança de classes Tailwind no drawer pode alterar levemente a altura visível das outras abas; mitigado mantendo a estrutura interna delas (apenas troco o calc fixo por `h-full`).
4. **Quem é afetado:** apenas usuários da Controladoria que abrem o drawer de detalhes de processos OAB.

## Validação
- Abrir um processo apartado + sigiloso (cabeçalho grande): confirmar que a aba Resumo rola até o fim ("Automação de Prazos").
- Abrir um processo normal (cabeçalho pequeno): confirmar que o Resumo ocupa mais espaço e ainda rola se necessário.
- Verificar abas Andamentos, Partes e Intimações: scroll continua funcionando, sem cortes.
- Testar em viewport mobile (largura ~480px) e desktop (1500px+).
