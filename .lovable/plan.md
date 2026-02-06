
# Adicionar Opcao "Editar Prazo" nos Menus da Agenda

## Situacao Atual

A funcionalidade de edicao de prazos ja existe parcialmente no sistema:
- O componente `EditarPrazoDialog` esta pronto e funcionando
- Em `Agenda.tsx`, a opcao "Editar Prazo" ja existe em alguns menus (Prazos Vencidos e Proximos Prazos)
- **Faltando**: A opcao nao esta em todos os menus dropdown de 3 pontinhos

## O Que Sera Adicionado

A opcao "Editar Prazo" sera incluida em TODOS os menus de 3 pontinhos onde aparece "Estender Prazo".

---

## Locais a Modificar

### Arquivo: `src/pages/Agenda.tsx`

**Local 1 - Prazos do dia selecionado (linhas 1050-1060)**
- Adicionar "Editar Prazo" antes de "Estender Prazo"
- Este e o unico local faltando neste arquivo

### Arquivo: `src/components/Agenda/AgendaContent.tsx`

Este arquivo precisa de mais alteracoes pois nao tem nenhuma implementacao de edicao:

**1. Importar dependencias:**
- Adicionar `Pencil` aos imports do lucide-react
- Importar o componente `EditarPrazoDialog`

**2. Adicionar estados:**
- `isEditDialogOpen: boolean`
- `editDeadline: Deadline | null`

**3. Criar funcao helper:**
```typescript
const openEditDialog = (deadline: Deadline) => {
  setEditDeadline(deadline);
  setIsEditDialogOpen(true);
};
```

**4. Atualizar 4 menus dropdown:**
- Prazos do dia selecionado (linha ~790-800)
- Prazos Vencidos (linha ~892-896)
- Proximos Prazos (linha ~940-944)
- (Os outros locais nao tem menu dropdown)

**5. Renderizar o dialog:**
- Adicionar `EditarPrazoDialog` no final do componente

---

## Fluxo de Edicao

```
Usuario clica nos 3 pontinhos
        |
        v
Menu aparece com opcoes:
  - Editar Prazo (novo)
  - Estender Prazo
        |
        v
Clica em "Editar Prazo"
        |
        v
Modal EditarPrazoDialog abre
  - Titulo
  - Descricao
  - Data
  - Responsavel
  - Usuarios marcados
        |
        v
Salva alteracoes
  - Atualiza banco de dados
  - Registra comentario de auditoria
  - Recarrega lista de prazos
```

---

## Permissoes

A opcao de editar seguira a mesma logica ja implementada:
- Apenas usuarios **Admin** ou **Controller** verao o menu de 3 pontinhos
- Isso e controlado pela condicao `isAdmin` que ja existe

---

## Resumo de Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Agenda.tsx` | Adicionar "Editar Prazo" no menu dos prazos do dia selecionado |
| `src/components/Agenda/AgendaContent.tsx` | Importar componente, adicionar estados, funcao helper, atualizar 3 menus e renderizar dialog |

---

## Resultado Visual

Antes:
```
[...] 
  └─ Estender Prazo
```

Depois:
```
[...]
  ├─ Editar Prazo
  └─ Estender Prazo
```
