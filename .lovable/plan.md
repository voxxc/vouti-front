

## Fix: Topbar duplicada no AcordosView dentro do Drawer

### Problema
`AcordosView` (linha 380) envolve todo o conteúdo em `<DashboardLayout>`, que inclui a topbar. Quando o `ProjectDrawerContent` renderiza `AcordosView` dentro do drawer (que já está dentro de um layout com topbar), a topbar aparece duplicada.

### Solução

**Arquivo: `src/pages/AcordosView.tsx`**
- Adicionar prop `embedded?: boolean` na interface `AcordosViewProps`
- Quando `embedded={true}`, renderizar apenas o conteúdo (`<div className="space-y-6">...`) sem o `<DashboardLayout>` wrapper
- Quando `embedded={false}` ou omitido, manter o `<DashboardLayout>` (para a rota standalone `/:tenant/project/:id/acordos`)

**Arquivo: `src/components/Project/ProjectDrawerContent.tsx`**
- Passar `embedded={true}` na chamada `<AcordosView ... embedded />` (linha 224)

Padrão idêntico ao já usado no `ProjectView` que recebe `embedded={true}`.

