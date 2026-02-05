

# Drawer de Usuários com Animação de Cima para Baixo

## Situação Atual

O botão "Usuários" no header do `DashboardLayout` atualmente:
- Chama `onCreateUser` que é passado via props
- No `Dashboard.tsx`, isso seta `showUserManagement = true`
- Isso renderiza uma página inteira com o componente `UserManagement`

## Conceito Visual

```text
ATUAL:                                  PROPOSTO:
                                        
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│ Header        [Usuarios] [Sair] │     │ Header        [Usuarios] [Sair] │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│                                 │     │ ┌─────────────────────────────┐ │
│   PAGINA INTEIRA                │     │ │  Gerenciamento de Usuários  │ │ <- drawer
│   de UserManagement             │     │ │  ░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │    de cima
│   com botão "Voltar"            │     │ │  [Usuario 1] [Usuario 2]    │ │    pra baixo
│                                 │     │ │  ░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│                                 │     │ └─────────────────────────────┘ │
│                                 │     │                                 │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

## Alterações

### 1. Criar arquivo: `src/components/Admin/UserManagementDrawer.tsx`

Novo componente drawer que encapsula o UserManagement:

```tsx
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";
import UserManagement from "./UserManagement";
import { User } from "@/types/user";

interface UserManagementDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  onAddUser: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditUser: (userId: string, userData: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
}

export function UserManagementDrawer({
  open,
  onOpenChange,
  users,
  onAddUser,
  onEditUser,
  onDeleteUser
}: UserManagementDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="top"
        className="p-0 flex flex-col h-[85vh]"
      >
        <SheetTitle className="sr-only">Gerenciamento de Usuários</SheetTitle>
        
        {/* Header */}
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Gerenciamento de Usuários</span>
        </div>

        {/* Conteudo scrollavel */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <UserManagement
              users={users}
              onAddUser={onAddUser}
              onEditUser={onEditUser}
              onDeleteUser={onDeleteUser}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

### 2. Atualizar: `src/pages/Dashboard.tsx`

Substituir a renderização condicional por um drawer:

**Adicionar imports:**
```tsx
import { UserManagementDrawer } from "@/components/Admin/UserManagementDrawer";
```

**Alterar estado:**
```tsx
// Manter: const [showUserManagement, setShowUserManagement] = useState(false);
// Será usado para controlar o drawer
```

**Remover o bloco condicional** `if (showUserManagement) { ... }` (linhas 125-142)

**Adicionar drawer no final do componente** (antes do `</DadosSensiveisProvider>`):

```tsx
{/* User Management Drawer */}
<UserManagementDrawer
  open={showUserManagement}
  onOpenChange={setShowUserManagement}
  users={systemUsers}
  onAddUser={handleAddUser}
  onEditUser={handleEditUser}
  onDeleteUser={handleDeleteUser}
/>
```

### 3. Atualizar: `src/components/Dashboard/DashboardLayout.tsx`

Atualizar a interface para passar os handlers necessários:

**Atualizar interface:**
```tsx
interface DashboardLayoutProps {
  // ... existentes
  onCreateUser?: () => void;  // Manter - abrirá o drawer
  // Remover necessidade de passar users e handlers
}
```

O botão continua funcionando igual - quando clicado, chama `onCreateUser` que seta `showUserManagement(true)` e agora abre o drawer.

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Admin/UserManagementDrawer.tsx` | Criar novo arquivo (drawer side="top") |
| `src/pages/Dashboard.tsx` | Remover renderização condicional e adicionar drawer |

## Resultado

- Drawer abre de cima para baixo com animação fluida
- Ocupa 85% da altura da tela (`h-[85vh]`)
- Mantém o conteúdo scrollável
- Botão X no canto superior direito para fechar
- Consistente com o padrão visual dos outros drawers

