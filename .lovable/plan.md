
# Modal de Edição de Usuário no Drawer

## Resumo
Adicionar o Dialog de edição completo ao `UserManagementDrawer.tsx`, permitindo ao clicar no ícone de lápis abrir um modal com todas as funcionalidades de edição: nome, email, senha e permissões.

---

## Funcionalidades do Modal

O modal de edição incluirá:
1. **Nome** - Campo de texto editável
2. **Email** - Atualizado via Edge Function `update-user-email`
3. **Nova Senha** - Opcional, via Edge Function `update-user-password`
4. **Perfil Principal** - Select com opções (Advogado, Comercial, Financeiro, Controller, Agenda, Admin)
5. **Permissões Adicionais** - Checkboxes para áreas extras (Agenda, Clientes, Financeiro, Controladoria, Reuniões)

---

## Arquitetura

```text
UserManagementDrawer
    |
    +-- Lista de usuários (existente)
    |       |
    |       +-- Click no lápis → abre Dialog de edição
    |
    +-- Dialog de Edição (NOVO)
            |
            +-- Form com campos: nome, email, senha, perfil, permissões
            +-- Botão Salvar → chama Edge Functions + atualiza banco
```

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Admin/UserManagementDrawer.tsx` | Adicionar Dialog completo de edição com toda a lógica |

---

## Imports Adicionais

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenantId } from "@/hooks/useTenantId";
```

---

## Estados Adicionais

```tsx
const [isEditOpen, setIsEditOpen] = useState(false);
const [editingUser, setEditingUser] = useState<User | null>(null);
const [loading, setLoading] = useState(false);
const [editUserTenantId, setEditUserTenantId] = useState<string | null>(null);
const [editFormData, setEditFormData] = useState({
  name: '',
  email: '',
  password: '',
  role: 'advogado' as User['role'],
  additionalPermissions: [] as string[]
});
```

---

## Constante de Permissões

```tsx
const ADDITIONAL_PERMISSIONS = [
  { id: 'agenda', role: 'agenda', label: 'Agenda' },
  { id: 'clientes', role: 'comercial', label: 'Clientes' },
  { id: 'financeiro', role: 'financeiro', label: 'Financeiro' },
  { id: 'controladoria', role: 'controller', label: 'Controladoria' },
  { id: 'reunioes', role: 'reunioes', label: 'Reuniões' },
];
```

---

## Lógica Principal

### handleUserClick (modificado)
```tsx
const handleUserClick = async (user: User) => {
  setEditingUser(user);
  setLoading(true);
  
  try {
    // 1. Buscar tenant_id do usuário
    // 2. Buscar roles do usuário (com is_primary)
    // 3. Preencher editFormData
    // 4. Abrir dialog
    setIsEditOpen(true);
  } catch (error) {
    toast({ title: "Erro", ... });
  } finally {
    setLoading(false);
  }
};
```

### handleEditSubmit
```tsx
const handleEditSubmit = async (e: React.FormEvent) => {
  // 1. Validar dados
  // 2. Atualizar email (se mudou) via Edge Function
  // 3. Atualizar profile (nome)
  // 4. Atualizar roles via Edge Function admin-set-user-roles
  // 5. Atualizar senha (se fornecida) via Edge Function
  // 6. Chamar onEditUser callback
  // 7. Fechar dialog
};
```

---

## Visual do Dialog

```text
+----------------------------------------+
| Editar Usuário                         |
+----------------------------------------+
| Nome                                   |
| [João Silva                        ]   |
|                                        |
| Email                                  |
| [joao@email.com                    ]   |
|                                        |
| Nova Senha (opcional)                  |
| [••••••••                          ]   |
| Mínimo 6 caracteres. Deixe vazio...    |
|                                        |
| Perfil                                 |
| [Advogado                          v]  |
|                                        |
| Permissões Adicionais                  |
| Áreas extras que este usuário terá...  |
| [x] Agenda    [ ] Clientes             |
| [ ] Financeiro [ ] Controladoria       |
| [ ] Reuniões                           |
|                                        |
| [✓] Selecionadas: Agenda               |
|                                        |
| [         Salvar Alterações         ]  |
+----------------------------------------+
```

---

## Fluxo de Edição

1. Usuário clica no ícone de lápis
2. Sistema busca dados atuais do usuário (tenant, roles)
3. Dialog abre com formulário preenchido
4. Usuário edita campos desejados
5. Clica em "Salvar Alterações"
6. Sistema chama Edge Functions necessárias
7. Toast de sucesso/erro
8. Dialog fecha e lista atualiza

---

## Edge Functions Utilizadas

| Edge Function | Quando usada |
|---------------|--------------|
| `update-user-email` | Email alterado |
| `update-user-password` | Senha fornecida |
| `admin-set-user-roles` | Sempre (perfil + permissões) |

---

## Proteções

1. **Auto-edição de admin**: Impedir que admin remova sua própria role de admin
2. **Validação de tenant**: Verificar se usuário pertence ao mesmo tenant
3. **Validação de senha**: Mínimo 6 caracteres

---

## Detalhes Técnicos

- Reutiliza a mesma lógica do `UserManagement.tsx` (testada e funcionando)
- Mantém compatibilidade com o callback `onEditUser` existente
- Dialog com `modal={true}` para evitar interações indesejadas durante edição
- Loading state no botão durante operações assíncronas
