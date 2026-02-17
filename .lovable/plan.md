

## Adicionar logo vouti. no header do dashboard (exceto Solvenza)

### O que sera feito

Adicionar o logo "vouti." no lado esquerdo do header do dashboard, antes do campo de busca rapida. O logo aparecera em todos os tenants, **exceto** quando o tenant for "Solvenza" (que usa seu proprio logo).

### Mudanca tecnica

**Arquivo: `src/components/Dashboard/DashboardLayout.tsx`**

- Importar o componente `LogoVouti` e o hook `useTenant`
- No header, dentro da div esquerda (`hidden md:flex items-center gap-2`), adicionar o `LogoVouti` com tamanho `sm` antes do `ProjectQuickSearch`
- Condicionar a exibicao: so renderizar se `tenantSlug !== 'solvenza'`
- O logo sera apenas visual (sem link), mantendo o estilo minimalista do header

### Resultado

- Todos os tenants verao o logo "vouti." no header (ex: `/demorais`, `/vouti`, etc.)
- O tenant Solvenza (`/solvenza`) nao vera o logo
- Consistencia visual com a identidade da marca em todo o sistema
