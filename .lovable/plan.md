## Causa raiz

Em `src/components/Controladoria/ProcessoOABDetalhes.tsx` (linha 1016), o card "Andamentos não carregados" é exibido sempre que `processo.detalhes_request_id` está vazio, ignorando o caso em que a lista `andamentos` já está populada (processos sincronizados por outro fluxo, como OAB/monitoramento, podem ter andamentos sem `detalhes_request_id`).

## Correção

Adicionar `andamentos.length === 0` à condição de exibição do bloco:

```tsx
{!processo.detalhes_request_id && andamentos.length === 0 && onCarregarDetalhes && ( ... )}
```

A condição da lista (linha 1045) já cobre `andamentos.length > 0`, então a lista continua aparecendo normalmente.

## Arquivos afetados

- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — 1 linha alterada.

## Impacto

1. **Usuário final:** processos que já têm andamentos carregados deixam de mostrar o aviso confuso "Andamentos não carregados" acima da lista. O botão "Carregar Andamentos" continua disponível no cabeçalho da aba (refresh) para reprocessar.
2. **Dados:** nenhuma mudança — apenas UI condicional.
3. **Riscos colaterais:** se um processo tiver andamentos antigos mas o usuário quiser forçar nova busca sem `detalhes_request_id`, ele ainda pode usar o botão de refresh existente na lista (linha 1047+). Sem regressão funcional.
4. **Afetados:** todos os usuários da Controladoria que abrem o detalhe de processo OAB.

## Validação

- Abrir um processo com andamentos já listados (como o screenshot enviado, 31 andamentos): o card de aviso não deve mais aparecer.
- Abrir um processo novo sem `detalhes_request_id` e sem andamentos: card continua aparecendo com o botão "Carregar Andamentos".
