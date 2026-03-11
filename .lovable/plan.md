

## Bloquear scroll do fundo quando o Dialog mobile está aberto

### Mudança em `src/pages/HomePage.tsx`

Adicionar um `useEffect` que aplica `overflow: hidden` no `document.body` quando `showMobileWelcome` é `true`, e remove quando fecha:

```tsx
useEffect(() => {
  if (showMobileWelcome) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
  return () => { document.body.style.overflow = ''; };
}, [showMobileWelcome]);
```

Isso impede o scroll da página enquanto o dialog está visível.

