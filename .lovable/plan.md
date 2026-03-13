

# Corrigir fresta do drawer e adicionar botão para /projects

## Alterações

### 1. `src/components/ui/sheet.tsx` — Remover fresta (linha 43)
Variante `inset`: remover `md:top-[57px]` e `md:left-[224px]` para cobrir tela toda.

```
De: "top-0 md:top-[57px] md:left-[224px] left-0 right-0 bottom-[56px] md:bottom-0 ..."
Para: "top-0 left-0 right-0 bottom-[56px] md:bottom-0 ..."
```

### 2. `src/components/Projects/ProjectsDrawer.tsx` — Botão "Ver todos os projetos"
Já existe um botão "Ver todos os projetos" no final (navega para `/projects`). Vou adicionar também um botão com ícone `ExternalLink` no **header** do drawer, ao lado do título "Projetos", que navega para `/projects` e fecha o drawer. Assim fica acessível sem precisar rolar até o final.

### 3. `src/components/Project/ProjectDrawer.tsx` — Botão no header
Adicionar botão com ícone `ExternalLink` no header do `ProjectDrawerContent` que navega para `/projects` usando `useTenantNavigation`.

## Arquivos alterados
- `src/components/ui/sheet.tsx`
- `src/components/Projects/ProjectsDrawer.tsx`
- `src/components/Project/ProjectDrawer.tsx`

