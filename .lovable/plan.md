## Causa raiz

No último ajuste de `ProcessoOABDetalhes.tsx` adicionei `relative` ao `className` do `<SheetContent>`:

```tsx
<SheetContent className="w-full sm:max-w-xl relative overflow-visible" ...>
```

O `cn()` do shadcn usa **tailwind-merge**, que detecta o conflito de utilidades de posicionamento e descarta o `fixed` original do `sheetVariants`. Sem `fixed`, o `inset-y-0 right-0` não tem efeito (só funciona em elementos posicionados absolutamente/fixos), então o drawer renderiza fora de tela com altura zero. O usuário vê apenas o **overlay com `backdrop-blur-md`** ("embaçado") e nada mais.

A motivação original do `relative` era servir de containing block para o subdrawer (`absolute right-full top-0`). Mas `fixed` **também** cria um containing block — então `relative` é desnecessário e quebra tudo.

## Correção

Remover apenas o token `relative` do `className` do `<SheetContent>`. Manter `overflow-visible` (necessário para o subdrawer "vazar" para a esquerda) e as larguras.

```tsx
<SheetContent
  className="w-full sm:max-w-xl overflow-visible"
  onInteractOutside={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
>
```

O subdrawer interno continua funcionando porque `SheetPrimitive.Content` mantém `position: fixed`, que estabelece o containing block para o filho `absolute right-full top-0`.

## Arquivos afetados

- `src/components/Controladoria/ProcessoOABDetalhes.tsx` (1 linha — `className` do `SheetContent`)

## Impacto

1. **Usuário final (UX)**: o drawer de detalhes do caso volta a abrir normalmente do lado direito. O subdrawer de movimentação continua deslizando para a esquerda como antes. Sem mais "tela embaçada travada".
2. **Dados**: nenhuma alteração — só CSS.
3. **Riscos colaterais**: nenhum. O subdrawer não depende de `position: relative` no pai porque `fixed` também cria containing block.
4. **Quem é afetado**: todos os tenants que usam Controladoria/OAB → abertura de casos/processos judiciais (admin, controller, advogado, estagiário, etc.).

## Validação

- Abrir um caso na aba OAB do tenant `demorais` → drawer deve aparecer à direita.
- Clicar em um andamento com anexo → subdrawer deve surgir saindo da borda esquerda do drawer principal.
- ESC fecha primeiro o subdrawer, depois o drawer.
- Clicar nos botões internos (AlertDialogs de monitoramento/reset) não fecha o drawer.
