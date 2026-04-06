

## Plano: Aumentar tamanho da logo do escritório

### Mudança
Aumentar o `max-height` da logo em dois lugares:

**Arquivo**: `src/components/Controladoria/ControladoriaIndicadores.tsx`

1. **Linha 265** — Logo na impressão/PDF: trocar `max-height:60px` para `max-height:160px`
2. **Linha 855** — Preview no dialog: trocar `max-h-16` para `max-h-40`

Ambas as mudanças são simples substituições de valor CSS.

