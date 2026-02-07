
# Impedir Fechamento do Drawer ao Interagir com Topbar

## Problema

Com o drawer do projeto aberto, ao interagir com elementos do topbar (busca global, notificacoes, TOTP, tema, etc.), o drawer fecha automaticamente. O drawer so deve fechar com:
- ESC 2x
- Clicar no X
- Clicar em outra secao (sidebar)

## Causa Raiz

O Radix Dialog (usado pelo Sheet) detecta interacoes fora do conteudo do drawer e dispara o fechamento atraves de eventos como:
- `onInteractOutside` - cliques fora do conteudo
- `onPointerDownOutside` - mouse down fora do conteudo  
- `onFocusOutside` - foco em elemento fora do conteudo

Mesmo com `modal={false}`, esses eventos ainda podem disparar o fechamento quando o usuario interage com o topbar.

## Solucao

Adicionar os handlers `onInteractOutside` e `onPointerDownOutside` no `SheetContent` do `ProjectDrawer` para prevenir o fechamento automatico, seguindo o mesmo padrao ja usado no `Dialog.tsx` e no `ProcessoCNPJDetalhes.tsx`.

## Mudanca no Codigo

### Arquivo: `src/components/Project/ProjectDrawer.tsx`

**Antes:**
```tsx
<SheetContent 
  side="inset"
  className="p-0 flex flex-col"
>
```

**Depois:**
```tsx
<SheetContent 
  side="inset"
  className="p-0 flex flex-col"
  onInteractOutside={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
>
```

## Comportamento Apos a Mudanca

| Interacao | Antes | Depois |
|-----------|-------|--------|
| Clicar no topbar | Fecha drawer | Drawer permanece aberto |
| Clicar no busca global | Fecha drawer | Drawer permanece aberto |
| Clicar em notificacoes | Fecha drawer | Drawer permanece aberto |
| Pressionar ESC | Fecha drawer | Fecha drawer |
| Clicar no X | Fecha drawer | Fecha drawer |
| Clicar em outra secao (sidebar) | Fecha drawer | Fecha drawer (via estado) |

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Project/ProjectDrawer.tsx` | Adicionar `onInteractOutside` e `onPointerDownOutside` |
