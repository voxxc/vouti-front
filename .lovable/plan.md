

## Usar a imagem PNG como logo Solvenza

### Alterações

1. **Copiar** `user-uploads://Design_sem_nome.png` para `src/assets/logo-solvenza.png`
2. **Reescrever `src/components/LogoSolvenza.tsx`**: substituir todo o SVG por um `<img>` importado, mantendo props `size` e `className`
   - `sm`: height 48px
   - `md`: height 72px
   - `lg`: height 100px

### Arquivo afetado
- `src/components/LogoSolvenza.tsx`

