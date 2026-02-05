
# Desativar "Clique Fora" nos Dialogs Modais

## Problema

Atualmente, quando um Dialog (modal com fundo escuro) esta aberto, clicar na area escura fora da janela fecha o dialog automaticamente. O usuario quer desativar esse comportamento para evitar fechamentos acidentais.

## Solucao

Modificar o componente `DialogContent` em `src/components/ui/dialog.tsx` para interceptar o evento de clique fora e prevenir o fechamento.

---

## Alteracao Tecnica

### Arquivo: `src/components/ui/dialog.tsx`

Adicionar a prop `onInteractOutside` ao `DialogPrimitive.Content` com `event.preventDefault()`:

**De:**
```tsx
<DialogPrimitive.Content
  ref={ref}
  className={cn(...)}
  {...props}
>
```

**Para:**
```tsx
<DialogPrimitive.Content
  ref={ref}
  onInteractOutside={(event) => event.preventDefault()}
  className={cn(...)}
  {...props}
>
```

---

## Como Funciona

O Radix UI Dialog dispara o evento `onInteractOutside` quando o usuario clica fora do conteudo do dialog. Chamando `event.preventDefault()`, impedimos que esse clique feche o modal.

O usuario ainda podera fechar o dialog:
- Clicando no botao X no canto superior direito
- Pressionando a tecla ESC
- Clicando em botoes de "Cancelar" ou "Fechar" dentro do dialog

---

## Resultado Esperado

1. Clicar no fundo escuro NAO fecha mais o dialog
2. O botao X continua funcionando normalmente
3. A tecla ESC continua funcionando (se quiser desativar tambem, posso adicionar `onEscapeKeyDown={(e) => e.preventDefault()}`)
4. Todos os dialogs da aplicacao serao afetados (comportamento global)
