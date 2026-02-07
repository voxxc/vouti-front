

# Unificar Experiência do Projeto no Drawer

## Problema Identificado

O `ProjectDrawerContent` atual é uma versão "resumida" com botão "Abrir Completo" que navega para a página `/project/:id`. Porém, isso não faz sentido porque:

1. O drawer já ocupa o mesmo espaço visual (entre sidebar e topbar)
2. Navegar para a página completa quebra o fluxo de drawer
3. O usuário perde o contexto da navegação atual

## Solucao

Remover o botão "Abrir Completo" e adicionar ao `ProjectDrawerContent` TODAS as funcionalidades que existem no `ProjectView`:

### Funcionalidades a Adicionar no Drawer

| Funcionalidade | Existe no ProjectView | Falta no Drawer |
|----------------|----------------------|-----------------|
| Botão "Dados" (admin) | Sim | Adicionar |
| Botão "Histórico" (admin) | Sim | Adicionar |
| ProjectClientDataDialog | Sim | Adicionar |
| ProjectHistoryDrawer | Sim | Adicionar |
| Verificação isAdmin | Sim | Adicionar |

### Mudancas no Codigo

#### 1. Remover botao "Abrir Completo"

Linha 354-362 do ProjectDrawerContent.tsx - remover:

```tsx
// REMOVER:
<Button
  variant="ghost"
  size="sm"
  onClick={handleOpenFullProject}
  className="gap-2 flex-shrink-0"
>
  <ExternalLink className="h-4 w-4" />
  <span className="hidden sm:inline">Abrir completo</span>
</Button>
```

#### 2. Adicionar verificacao de admin

```tsx
const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
  const checkAdmin = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!data);
  };
  checkAdmin();
}, [user?.id]);
```

#### 3. Adicionar estados para dialogs

```tsx
const [isClientDataOpen, setIsClientDataOpen] = useState(false);
const [isHistoryOpen, setIsHistoryOpen] = useState(false);
```

#### 4. Adicionar botoes no header (para admins)

```tsx
{isAdmin && (
  <Button variant="ghost" size="sm" onClick={() => setIsClientDataOpen(true)}>
    <FileText className="h-4 w-4" />
    <span className="hidden lg:inline">Dados</span>
  </Button>
)}

{isAdmin && (
  <Button variant="ghost" size="sm" onClick={() => setIsHistoryOpen(true)}>
    <History className="h-4 w-4" />
    <span className="hidden lg:inline">Histórico</span>
  </Button>
)}
```

#### 5. Adicionar componentes de dialogs

```tsx
{/* Client Data Dialog */}
{isAdmin && project.clienteId && (
  <ProjectClientDataDialog
    isOpen={isClientDataOpen}
    onClose={() => setIsClientDataOpen(false)}
    clienteId={project.clienteId}
  />
)}

{/* History Drawer */}
{isAdmin && (
  <ProjectHistoryDrawer
    projectId={project.id}
    projectName={project.name}
    isOpen={isHistoryOpen}
    onClose={() => setIsHistoryOpen(false)}
  />
)}
```

### Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Project/ProjectDrawerContent.tsx` | Adicionar funcionalidades completas |

### Resultado Final

O drawer tera a MESMA experiencia da pagina completa:

```text
+-------------------------------------------------------------------+
| [FolderOpen] Nome do Projeto           [Dados] [Historico]    [X] |
|              Cliente                                              |
+-------------------------------------------------------------------+
| [Workspace Tabs: Principal | Aba 2 | ...]                         |
+-------------------------------------------------------------------+
| [Processos] [Casos] [Colunas]    [Participantes] [Lock] [Setores] |
+-------------------------------------------------------------------+
|                                                                   |
|  Conteudo completo (igual a pagina /project/:id)                  |
|                                                                   |
+-------------------------------------------------------------------+
```

### Beneficios

1. **Experiencia consistente**: Nao ha diferenca entre drawer e pagina
2. **Velocidade**: Usuario acessa tudo sem navegacao adicional
3. **Contexto preservado**: Usuario permanece no drawer sem perder onde estava
4. **Codigo mais simples**: Nao precisa manter duas versoes do mesmo componente

