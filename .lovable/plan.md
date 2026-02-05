
# Corrigir Sidebar Inclicavel com Drawer Aberto

## Problema Identificado

A implementacao anterior usou `onInteractOutside={(e) => e.preventDefault()}` para evitar que o drawer feche ao clicar fora, porem o Radix Dialog por padrao e `modal={true}`, o que:

1. Adiciona `pointer-events: none` ao body
2. Cria um "focus trap" que bloqueia interacoes fora do dialog
3. Esconde conteudo de leitores de tela

Por isso a sidebar ficou completamente inclicavel enquanto um drawer esta aberto.

## Solucao

Usar a prop `modal={false}` no componente `Sheet` para os drawers do tipo `inset` e `left-offset`. Isso:

1. Permite interacao com elementos fora do drawer (sidebar)
2. Mantem o drawer aberto ate ser explicitamente fechado
3. Permite troca direta entre drawers com um unico clique

## Alteracoes Tecnicas

### 1. src/components/ui/sheet.tsx

Adicionar uma nova prop `modal` ao `SheetContent` e passa-la para o `Sheet` (Root):

```tsx
interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  modal?: boolean;
}
```

### 2. Abordagem Alternativa (mais limpa)

Como o `Sheet` ja exporta o `SheetPrimitive.Root` como `Sheet`, a solucao e passar `modal={false}` diretamente nos componentes dos drawers:

```tsx
// Em AgendaDrawer.tsx, ProjectsDrawer.tsx, etc:
<Sheet open={open} onOpenChange={onOpenChange} modal={false}>
```

Esta abordagem e mais simples e nao requer alteracoes no componente base `sheet.tsx`.

## Arquivos a Editar

1. `src/components/Agenda/AgendaDrawer.tsx` - Adicionar `modal={false}`
2. `src/components/Projects/ProjectsDrawer.tsx` - Adicionar `modal={false}`
3. `src/components/Controladoria/ControladoriaDrawer.tsx` - Adicionar `modal={false}`
4. `src/components/CRM/CRMDrawer.tsx` - Adicionar `modal={false}`
5. `src/components/Financial/FinancialDrawer.tsx` - Adicionar `modal={false}`
6. `src/components/Reunioes/ReunioesDrawer.tsx` - Adicionar `modal={false}`
7. `src/components/ui/sheet.tsx` - Remover o `onInteractOutside` pois nao sera mais necessario

## Resultado Esperado

1. Usuario clica em "Agenda" - Drawer da Agenda abre
2. Com drawer aberto, usuario clica em "Controladoria" - Drawer da Controladoria abre diretamente (substituindo Agenda)
3. Sidebar permanece completamente funcional enquanto drawer esta aberto
4. Drawer fecha apenas ao clicar no X ou navegar para Dashboard/Extras
