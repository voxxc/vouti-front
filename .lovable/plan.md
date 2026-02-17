

## Restaurar Workspace Tabs no CRM + Remover "Vinculo" dos Cards

### O que muda

1. **Restaurar as abas de Workspace (tabs)** no modo CRM -- atualmente escondidas pelo `module !== 'crm'`. Isso permite criar novos workspaces dentro de projetos CRM.

2. **Remover a aba "Vinculo"** do `TaskModal` quando `module === 'crm'` -- essa aba serve para vincular processos judiciais e nao faz sentido no CRM.

---

### Arquivos a modificar

| Arquivo | Acao |
|---|---|
| `src/pages/ProjectView.tsx` | Remover a condicao `module !== 'crm'` do `ProjectWorkspaceTabs` (linha ~1131), restaurando as tabs de workspace para o CRM. Passar `module` para o `TaskModal`. |
| `src/components/Project/TaskModal.tsx` | Receber prop `module?: string`. Quando `module === 'crm'`, esconder a aba "Vinculo" e ajustar o grid de `grid-cols-5` para `grid-cols-4`. |

---

### Detalhes tecnicos

**ProjectView.tsx (linha ~1130-1141)**
- Remover o wrapper `{module !== 'crm' && ( ... )}` ao redor do `ProjectWorkspaceTabs`, deixando-o sempre visivel.
- No `TaskModal` (linha ~1362), adicionar prop `module={module}`.

**TaskModal.tsx**
- Adicionar `module?: string` na interface `TaskModalProps`.
- Na `TabsList`, condicionar o numero de colunas: `grid-cols-${module === 'crm' ? '4' : '5'}`.
- Esconder o `TabsTrigger value="vinculo"` e o `TabsContent value="vinculo"` quando `module === 'crm'`.

