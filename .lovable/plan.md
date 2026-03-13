

# Afastar botão ExternalLink do X no drawer

O botão ExternalLink (`/projects`) e o X de fechar estão muito próximos porque ambos ficam no canto superior direito — o ExternalLink no header via `justify-between` e o X absoluto em `right-4 top-4`.

## Solução

No `ProjectDrawer.tsx`, adicionar `mr-8` ao botão ExternalLink para afastá-lo do X.

No `ProjectsDrawer.tsx`, fazer o mesmo no botão ExternalLink do header.

## Arquivos
- `src/components/Project/ProjectDrawer.tsx` — adicionar `mr-8` ao className do botão
- `src/components/Projects/ProjectsDrawer.tsx` — adicionar `mr-8` ao className do botão

