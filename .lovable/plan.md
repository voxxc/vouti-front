

## Fechar Dialog com duplo clique fora

### O que será feito

Adicionar um handler de `onDoubleClick` no `DialogOverlay` que fecha o dialog. O single click continua bloqueado (comportamento atual via `onInteractOutside: preventDefault`), mas o double click no overlay (área escura) fecha o dialog.

### Implementação

**`src/components/ui/dialog.tsx`**

O `DialogOverlay` precisa receber um `onDoubleClick` que dispara o close. Como o Overlay não tem acesso direto ao `onOpenChange`, a solução é mover o overlay para dentro do `DialogContent` e adicionar o handler lá:

```typescript
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay onDoubleClick={(e) => {
      // Find and click the close button to close the dialog
      const closeBtn = (e.currentTarget.nextElementSibling as HTMLElement)
        ?.querySelector('[data-radix-collection-item]') 
      // Simpler: use document to find the close button
      const dialog = document.querySelector('[data-state="open"][role="dialog"]');
      if (dialog) {
        const close = dialog.querySelector('button[class*="absolute right-4"]') as HTMLElement;
        close?.click();
      }
    }} />
    ...
```

Na verdade, a abordagem mais limpa: usar `DialogPrimitive.Close` de forma programática não é ideal. A melhor abordagem é fazer o Overlay disparar um evento customizado e usar a API do Radix. A forma mais simples e robusta:

- Envolver o overlay com um `div` que detecta `onDoubleClick` e chama `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))` — simulando ESC, que o Radix já trata.

**Abordagem final (mais limpa):**

No `DialogOverlay`, adicionar `onDoubleClick` que simula a tecla Escape:

```typescript
<DialogPrimitive.Overlay
  ref={ref}
  onDoubleClick={() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }}
  className={cn(...)}
  {...props}
/>
```

Isso é elegante porque reutiliza o mecanismo de fechamento que o Radix já implementa para ESC.

### Arquivo

| Arquivo | Mudança |
|---------|---------|
| `src/components/ui/dialog.tsx` | Adicionar `onDoubleClick` no Overlay que simula ESC |

