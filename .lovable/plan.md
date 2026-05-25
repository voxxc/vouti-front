# Anexos de andamento não aparecem no mobile

## Causa raiz

Em `ProcessoOABDetalhes.tsx` (linha ~511), o subdrawer que mostra o detalhe da movimentação (e onde estão os anexos clicáveis com preview real — `MovimentacaoDetalhe`) é renderizado com:

```
className="absolute right-full top-0 h-full w-[min(36rem,calc(100vw-2rem))] ..."
```

`right-full` posiciona o painel **à esquerda do Sheet principal**. No desktop o Sheet ocupa só a direita, então sobra espaço à esquerda e o subdrawer aparece. No mobile (390px), o Sheet ocupa 100% da largura → o subdrawer fica em `left = -100vw`, completamente fora da tela. Por isso, ao tocar no andamento para ver o anexo, "nada aparece".

A lista inline `AndamentoAnexos` mostra só nome + botão de download, não o preview/visualização — o fluxo de "ver anexo" depende do subdrawer.

## Correção

Tornar o subdrawer responsivo:

- **Desktop (`md+`)**: comportamento atual — desliza à esquerda do Sheet (`right-full`, largura ~36rem).
- **Mobile (`<md`)**: renderizar como overlay full-screen **sobre** o próprio Sheet (`inset-0`, `w-full h-full`, `z-50`), entrando da direita (`slide-in-from-right`). O botão "voltar" interno do `MovimentacaoDetalhe` (`onClose={fecharSubdrawer}`) já existe, então o usuário fecha e volta ao detalhe do processo normalmente.

Sem mudanças em `MovimentacaoDetalhe` — só nas classes do container que o embrulha.

## Arquivos afetados

- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — apenas o `div` wrapper do subdrawer (~linha 511-531).

## Impacto

1. **Usuário final**: no mobile, ao tocar em um andamento, o painel de detalhes (com lista de anexos clicáveis e preview de PDF/imagem/texto) passa a aparecer em tela cheia sobre o drawer. Botão fechar leva de volta à lista de andamentos. Desktop fica idêntico.
2. **Dados**: nenhuma mudança — puro CSS responsivo.
3. **Riscos colaterais**: mínimos. O z-index do overlay precisa ficar acima do conteúdo do Sheet (z-50 já usado). Verificar que não bloqueia o botão "X" de fechar do Sheet — como o subdrawer tem botão próprio de fechar e o usuário não precisa do X do Sheet enquanto vê o detalhe, é aceitável cobrir.
4. **Quem é afetado**: todos os usuários da Controladoria em mobile (qualquer tenant) ao visualizar anexos de andamentos OAB.

## Validação

- Abrir `/{tenant}/controladoria` no viewport 390px → OAB → processo → tocar em andamento com anexo → painel deve abrir em tela cheia → tocar no anexo → preview deve renderizar.
- Repetir em desktop (≥768px) → comportamento original (painel desliza à esquerda do drawer).
