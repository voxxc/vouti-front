
# Unificar Visual do Projeto no Drawer

## Problema

O drawer atual (`ProjectDrawerContent`) tem um visual completamente diferente da página completa (`ProjectView`). O usuário quer que o drawer abra o projeto com **exatamente o mesmo visual** da página via URL.

## Diferenças Identificadas

| Elemento | Página (ProjectView) | Drawer Atual |
|----------|---------------------|--------------|
| Header | Botão "Voltar" + Nome em H1 + links texto | Ícone + nome pequeno + botões |
| Ações | Links texto: "Participantes", "Dados", "Histórico" | Botões com ícones |
| Tabs | Texto simples com underline ativo | Radix TabsList com fundo cinza |
| Setores | SetoresDropdown componente dedicado | DropdownMenu genérico |
| Lock | Botão circular amarelo sempre visível no header | Escondido dentro das tabs |
| Layout | space-y-6 com respiração visual | Compacto com flex-col |

## Solucao

Reutilizar diretamente o componente `ProjectView` dentro do `ProjectDrawerContent`, passando as props necessárias. O `ProjectView` já tem todo o layout correto, só precisa:

1. Funcionar SEM o `DashboardLayout` (pois o drawer já está dentro dele)
2. Receber uma prop para indicar que está em modo drawer

## Mudancas Tecnicas

### 1. Modificar ProjectView.tsx

Adicionar prop opcional `embedded` que remove o wrapper `DashboardLayout`:

```tsx
interface ProjectViewProps {
  // ... props existentes
  embedded?: boolean; // NOVO: quando true, não renderiza DashboardLayout
}

// No return:
const content = (
  <div className="space-y-6">
    {/* Todo o conteúdo atual */}
  </div>
);

return embedded ? content : <DashboardLayout>{content}</DashboardLayout>;
```

### 2. Simplificar ProjectDrawerContent.tsx

Substituir toda a implementação duplicada por:

```tsx
export function ProjectDrawerContent({ projectId, onClose }: ProjectDrawerContentProps) {
  // Carregar dados do projeto (similar ao ProjectViewWrapper)
  // ...loading state...

  return (
    <ProjectView
      onLogout={() => {}}
      onBack={onClose}
      project={project}
      onUpdateProject={handleUpdateProject}
      currentUser={currentUser}
      users={[]}
      embedded={true}  // IMPORTANTE: modo drawer
    />
  );
}
```

### 3. Ajustar o botão "Voltar" no modo embedded

No `ProjectView`, quando `embedded=true`:
- O botão "Voltar" fecha o drawer (chama `onBack`)
- Não navega para outra página

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/ProjectView.tsx` | Adicionar prop `embedded` e renderização condicional |
| `src/components/Project/ProjectDrawerContent.tsx` | Simplificar para usar ProjectView |

## Resultado Final

O drawer terá EXATAMENTE o mesmo visual da página:

```
+-------------------------------------------------------------------+
| [<- Voltar]   ADRIANO SCHMIDT       Participantes Dados Histórico |
|               ADRIANO SCHMIDT                     [Setores v] [O] |
+-------------------------------------------------------------------+
| [ADRIANO SCH...]  [+ Nova Aba]                                    |
+-------------------------------------------------------------------+
| Processos    Casos    Colunas                                     |
|    ____                                                           |
+-------------------------------------------------------------------+
|                                                                   |
|  [Processos] ^ [1]                           [+ Novo processo]    |
|  +----------------------------------------------------------+    |
|  | Q Buscar processos...     | Y | Todos os... v | ⇅ |          |
|  +----------------------------------------------------------+    |
|                                                                   |
|  MANDAMENTAL - BANCO DO BRASIL                  [Em Andamento]   |
|  2/3 etapas concluidas                                           |
|                                                                   |
+-------------------------------------------------------------------+
```

## Beneficios

1. **Consistência total**: Drawer e página são visualmente idênticos
2. **Código DRY**: Não duplica lógica entre drawer e página
3. **Manutenção simplificada**: Alterações no ProjectView refletem automaticamente no drawer
4. **Design preservado**: Todo o trabalho de design feito na página é aproveitado
