
# Ícone de Edição Minimalista nos Usuários

## Resumo
Adicionar um ícone de edição (lápis) em cada item de usuário no drawer de gerenciamento, que aparece apenas ao passar o mouse por cima. Seguindo o padrão minimalista do sistema.

---

## Alteração Visual

### Antes
```text
┌──────────────────────────────────────────────────┐
│ João Silva                              [Admin]  │
│ joao@email.com                                   │
└──────────────────────────────────────────────────┘
```

### Depois (mouse hover)
```text
┌──────────────────────────────────────────────────┐
│ João Silva                         [✏️] [Admin]  │
│ joao@email.com                                   │
└──────────────────────────────────────────────────┘
                                      ^-- aparece no hover
```

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Admin/UserManagementDrawer.tsx` | Adicionar ícone Pencil com opacity-0 group-hover:opacity-100 |

---

## Implementação

```tsx
// Import adicional
import { Users, Plus, Search, Pencil } from "lucide-react";

// Dentro do map de usuários, entre o nome e o Badge:
<Pencil 
  className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 
             hover:text-primary transition-all shrink-0" 
/>
```

---

## Comportamento

1. **Estado normal**: Ícone invisível (opacity-0)
2. **Hover na linha**: Ícone aparece suavemente (opacity-100)
3. **Hover no ícone**: Cor muda para primary
4. **Click no ícone**: Abre dialog de edição (já implementado via handleUserClick)

---

## Detalhes Técnicos

- Usa classe `group` já existente no botão pai
- Transição suave com `transition-all`
- Ícone `Pencil` do lucide-react (padrão do sistema)
- Tamanho h-4 w-4 (16px) - discreto e minimalista
- Posicionado entre o email e o Badge de role
