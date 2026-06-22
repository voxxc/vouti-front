## Causa raiz

No `SuperAdminProcessoOABDetalhesPanel`, o estado local `andamentos` (e `data`) só é resetado dentro de um `useEffect([open, processo.id])`. Quando o drawer troca `selecionado` para o próximo processo, o painel re-renderiza com o novo `processo.id` ANTES do efeito rodar — então o primeiro paint mostra os andamentos antigos. Mesmo após `carregar()` rodar, o `setData(null)` zera `data`, mas `setAndamentos([])` NUNCA é chamado no reset, então a lista do processo anterior persiste visualmente até o fetch completar e sobrescrever.

## Correção

Forçar remount completo do painel sempre que o processo muda, passando `key={selecionado.id}` no `<SuperAdminProcessoOABDetalhesPanel>` dentro do drawer. Isso garante que todo estado interno (`data`, `andamentos`, `destravado`, `ordemDirty`, etc.) seja descartado e recriado limpo para cada processo, eliminando qualquer flash de dados antigos.

Alternativa considerada e descartada: resetar `andamentos`/`data` via `useRef` sincronamente quando `processo.id` muda. Mais frágil e propenso a esquecer novos estados no futuro — `key` é a solução idiomática do React para esse caso.

## Arquivos afetados

- `src/components/SuperAdmin/SuperAdminMovimentosManuaisDrawer.tsx` — adicionar `key={selecionado.id}` na renderização do painel.

## Impacto

- **Usuário final (UX)**: ao auto-avançar para o próximo processo, o painel exibe imediatamente o spinner de loading e depois os andamentos corretos. Sem mais andamentos "fantasmas" do processo anterior.
- **Dados**: zero — nenhuma mudança de rede, DB ou RLS.
- **Riscos colaterais**: nenhum. O `key` apenas remonta o componente; o `useEffect` interno já dispara o fetch como esperado. Como o painel não mantém estado que precise persistir entre processos, remount é seguro.
- **Quem é afetado**: super-admins usando o drawer de movimentos manuais.

## Validação

1. Abrir drawer, aba "Total", abrir um processo com andamentos visíveis.
2. Clicar "Finalizar" (ou "Marcar como atualizado") → painel troca para o próximo: confirmar que aparece spinner brevemente e então os andamentos do NOVO processo, sem flash do anterior.
3. Repetir várias vezes em sequência — sem regressão.
4. Fechar/abrir manualmente — funciona como antes.
