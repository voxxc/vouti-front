

# Corrigir variante `inset` do drawer

## Problema
A variante `inset` foi alterada para `top-0 left-0`, cobrindo o header e o sidebar. O correto era manter o drawer abaixo do header (`top-[49px]`) e ao lado do sidebar (`md:left-[224px]`), apenas eliminando a fresta de 57px→49px (a altura real do header é 49px, conforme `h-[49px]` no DashboardLayout).

## Solução

### `src/components/ui/sheet.tsx` (linha 43)
Alterar a variante `inset` de:
```
"top-0 left-0 right-0 bottom-[56px] md:bottom-0 ..."
```
Para:
```
"top-[49px] md:left-[224px] left-0 right-0 bottom-[56px] md:bottom-0 ..."
```

Isso posiciona o drawer exatamente abaixo do header (49px) e ao lado do sidebar no desktop (224px), eliminando a fresta sem cobrir header/sidebar.

