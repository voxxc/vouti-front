# Botão "Carregar Andamentos" — disparar importação CNJ real sem recarregar a página

## Causa raiz

Hoje o botão "Carregar Andamentos" (exibido no drawer do processo quando ele está sem `detalhes_request_id` e sem andamentos) é um **no-op**: a função `carregarDetalhes` em `src/hooks/useOABs.ts` apenas marca `detalhes_carregados: true` no estado local e não chama nenhuma Edge Function. Por isso processos importados pela OAB que ficaram sem andamentos (caso do tenant Vargas) nunca recebem dados, mesmo após o usuário clicar no botão.

Além disso, qualquer recarga atual chama `fetchProcessos()` da lista inteira, o que dá a sensação de "a página inteira atualizou".

## Correção

1. **`carregarDetalhes` passa a chamar de verdade a Judit**
   - Em `src/hooks/useOABs.ts`, substituir o no-op por uma invocação real à Edge Function `judit-resetar-processo` (ela já faz consulta on-demand, baixa andamentos e atualiza `detalhes_request_id`, `ultima_movimentacao`, etc.).
   - Por que `judit-resetar-processo` e não `judit-buscar-processo-cnj`: o segundo bloqueia com `duplicado: true` quando o processo já existe na OAB. O primeiro foi feito exatamente para "atualizar processo já cadastrado".
   - Em processos sem andamentos o monitoramento normalmente ainda não está ativo, então o efeito colateral de "desativar monitoramento" não acontece. Se estiver ativo, mantemos o aviso existente.

2. **Feedback claro sem fechar o drawer**
   - O drawer já mostra spinner + "Carregando..." durante `handleCarregarAndamentos`. Adicionar um toast informativo no início ("Buscando andamentos no tribunal, isso pode levar alguns segundos") e um toast de sucesso/erro ao fim.
   - Em caso de timeout/falha da Judit, mostrar mensagem amigável e manter o botão habilitado para nova tentativa.

3. **Atualizar somente o drawer (sem recarregar a lista)**
   - `carregarDetalhes` deixa de chamar `fetchProcessos()` global. Em vez disso, atualiza **apenas o registro alterado** no array `processos` local (merge com os campos retornados: `detalhes_request_id`, `ultima_movimentacao`, contadores).
   - O drawer continua chamando `fetchAndamentos()` (que é local ao próprio drawer) para listar os novos itens. O `useEffect` que sincroniza `selectedProcesso` com a lista local já cuida do resto.
   - Resultado: a tela atrás do drawer não pisca nem rola para o topo.

## Arquivos afetados

- `src/hooks/useOABs.ts` — reescrever `carregarDetalhes` para invocar `judit-resetar-processo` e fazer merge local do processo.
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — pequenos ajustes no `handleCarregarAndamentos` (toasts informativos + tratamento de erro) e garantir que não dispare refetch global.
- `src/components/Controladoria/OABTab.tsx` — verificar que `carregarDetalhes` repassado ao drawer não força `fetchProcessos()` após o retorno.

Nenhuma migração de banco. Nenhuma alteração em Edge Functions.

## Impacto

- **UX**: usuário clica em "Carregar Andamentos" em qualquer tenant → vê spinner + toast "Buscando andamentos no tribunal" → andamentos aparecem dentro do próprio drawer, sem a página atrás recarregar. Funciona igual para Vargas, Solvenza e todos os demais.
- **Dados**: chamadas adicionais à API Judit (consumo on-demand) apenas quando o usuário clica explicitamente — comportamento idêntico ao botão de "atualizar andamentos" que já existe ao lado. Sem mudança de schema, RLS ou performance global.
- **Riscos colaterais**: se o processo tiver monitoramento ativo, a consulta on-demand pode desativá-lo (regra existente da Judit, já tratada por `judit-resetar-processo`). O usuário recebe o toast informando para reativar. Casos sigilosos sem credencial continuam falhando com mensagem amigável.
- **Quem é afetado**: todos os tenants com processos sem andamentos. Sem mudança para super-admin.

## Validação

1. Tenant Vargas: abrir processo OAB sem andamentos → clicar "Carregar Andamentos" → confirmar que o drawer mostra spinner, a página atrás não recarrega, andamentos aparecem ao final.
2. Repetir em Solvenza com processo já com andamentos parados → comportamento equivalente ao botão "atualizar".
3. Testar caso de erro (CNJ inválido / Datalake fora) → toast de erro e botão volta a habilitar.
