
# Redesign do Drawer de Usuarios

## Objetivo
Converter o drawer de usuarios de um painel que abre do topo (side="top") para um drawer lateral direito com design minimalista, usando a mesma largura do drawer de Projetos (w-96 = 384px).

---

## Alteracoes

### 1. Criar nova variante "right-offset" no Sheet
**Arquivo:** `src/components/ui/sheet.tsx`

Adicionar nova variante para drawer lateral direito:
```tsx
"right-offset":
  "top-[57px] bottom-0 right-0 h-auto w-96 border-l data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in",
```

E atualizar a condicao do overlay para nao renderizar com essa variante:
```tsx
{side !== "inset" && side !== "left-offset" && side !== "right-offset" && <SheetOverlay />}
```

---

### 2. Refatorar UserManagementDrawer para design minimalista
**Arquivo:** `src/components/Admin/UserManagementDrawer.tsx`

**De (atual):**
- side="top" com h-[85vh]
- Renderiza o componente UserManagement completo (cards em grid)

**Para (novo):**
- side="right-offset" (lateral direita, largura w-96)
- modal={false} (manter sidebar interativa)
- Lista minimalista de usuarios (nomes clicaveis)
- Barra decorativa no lado esquerdo (igual ao Projetos no direito)
- Ao clicar no nome, abre modal de edicao

**Estrutura:**
```tsx
<Sheet open={open} onOpenChange={onOpenChange} modal={false}>
  <SheetContent side="right-offset" className="p-0 flex flex-col">
    {/* Barra decorativa no lado esquerdo */}
    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary/20 via-border to-primary/20 pointer-events-none" />
    
    {/* Header */}
    <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
      <Users className="h-5 w-5 text-primary" />
      <span className="font-semibold text-lg">Usuarios</span>
    </div>

    <ScrollArea className="flex-1">
      <div className="p-6 space-y-4">
        {/* Botao novo usuario */}
        <Button size="sm" className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          Novo Usuario
        </Button>

        {/* Busca */}
        <div className="relative max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar usuarios..." className="pl-9 h-9" />
        </div>

        {/* Lista minimalista */}
        <div className="space-y-1">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleEdit(user)}
              className="w-full text-left p-3 rounded-lg hover:bg-accent/50 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate group-hover:text-primary">
                    {user.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </div>
                </div>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="ml-2">
                  {user.role}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  </SheetContent>
</Sheet>

{/* Dialogs de criar/editar - fora do Sheet */}
<CreateUserDialog ... />
<EditUserDialog ... />
```

---

### 3. Mover logica de modais para o drawer
**Arquivo:** `src/components/Admin/UserManagementDrawer.tsx`

A logica de criacao e edicao de usuarios sera mantida atraves de Dialogs (modais) que abrem sobre o drawer:
- Dialog de criar usuario (reutilizando a logica do UserManagement)
- Dialog de editar usuario (reutilizando a logica do UserManagement)
- Confirmacao de exclusao

Isso mantem a funcionalidade completa mas com interface minimalista.

---

## Resultado Visual

### Antes
```
┌─────────────────────────────────────────────────────────────┐
│ Gerenciamento de Usuarios                                   │
├─────────────────────────────────────────────────────────────┤
│ [+ Adicionar Usuario]  [Busca________________]              │
│                                                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│ │ Card    │ │ Card    │ │ Card    │                        │
│ │ Avatar  │ │ Avatar  │ │ Avatar  │                        │
│ │ Nome    │ │ Nome    │ │ Nome    │                        │
│ │ Email   │ │ Email   │ │ Email   │                        │
│ │ [Edit]  │ │ [Edit]  │ │ [Edit]  │                        │
│ └─────────┘ └─────────┘ └─────────┘                        │
└─────────────────────────────────────────────────────────────┘
                Desce do topo, 85vh altura
```

### Depois
```
                                    ┌──────────────────────┐
                                    │ Usuarios             │
                                    ├──────────────────────┤
                                    │ [+ Novo Usuario]     │
                                    │ [Buscar usuarios...] │
                                    │                      │
                                    │ Maria Silva    admin │
                                    │ maria@email.com      │
                                    │ ──────────────────── │
                                    │ Joao Santos advogado │
                                    │ joao@email.com       │
                                    │ ──────────────────── │
                                    │ Ana Costa  comercial │
                                    │ ana@email.com        │
                                    └──────────────────────┘
                                         Drawer lateral
                                         direito (w-96)
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/ui/sheet.tsx` | Adicionar variante "right-offset" |
| `src/components/Admin/UserManagementDrawer.tsx` | Refatorar para lista minimalista lateral |

---

## Detalhes Tecnicos

- A variante "right-offset" tera a mesma largura (w-96 = 384px) que "left-offset" mas posicionada a direita
- modal={false} permite interacao com a sidebar enquanto o drawer esta aberto
- O UserManagement.tsx sera mantido intacto (pode ser usado como fallback ou em outras paginas)
- Os Dialogs de criar/editar serao extraidos e renderizados dentro do UserManagementDrawer
- Skeleton de loading seguira o mesmo padrao do ProjectsDrawer
