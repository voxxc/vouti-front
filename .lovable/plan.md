

## Plano: Corrigir ordem das abas na Controladoria

Trocar a ordem no array `tabs` em `ControladoriaContent.tsx` de `[OABs, Central, Push-Doc]` para `[Central, OABs, Push-Doc]`, e definir `'central'` como aba padrão.

### Mudança em `src/components/Controladoria/ControladoriaContent.tsx`
- Reordenar o array `tabs` para: Central → OABs → Push-Doc
- Alterar o estado inicial de `activeTab` de `'minhas-oabs'` para `'central'`

