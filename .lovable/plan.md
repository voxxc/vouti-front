

## Simplificar Projetos do CRM: Remover elementos juridicos e usar estetica Kanban CRM

### Contexto

O drawer de Projetos do CRM reutiliza o `ProjectView` do sistema juridico, que inclui elementos irrelevantes para o CRM:
- **Setores (dropdown)** - funcionalidade juridica
- **Aba "Casos"** - vinculo de processos judiciais
- **Aba "Processos"** - protocolos juridicos
- **Workspace Tabs** - abas de workspace do sistema juridico
- **Estetica Kanban Vouti** - colunas com borda colorida a esquerda (`KanbanColumn.tsx`, 250px, bordas laterais)

O Kanban do CRM (`WhatsAppKanban.tsx`) usa um estilo diferente: colunas com `bg-muted/50 rounded-lg`, bolinha colorida no header, layout mais limpo e compacto.

---

### Solucao: Prop `module` no ProjectView

Passar `module="crm"` desde o `WhatsAppProjects` ate o `ProjectView`, e condicionar a exibicao dos elementos.

---

### Arquivos a modificar

| Arquivo | Acao |
|---|---|
| `src/components/WhatsApp/sections/WhatsAppProjects.tsx` | Passar prop `module="crm"` para `ProjectDrawerContent` |
| `src/components/Project/ProjectDrawerContent.tsx` | Receber e repassar prop `module` para `ProjectView` |
| `src/pages/ProjectView.tsx` | Receber `module`, ocultar elementos juridicos quando `module === 'crm'`, e trocar estetica das colunas Kanban para o estilo CRM |

---

### Detalhes tecnicos

**1. WhatsAppProjects.tsx**
- Adicionar `module="crm"` na chamada do `ProjectDrawerContent`

**2. ProjectDrawerContent.tsx**
- Receber `module?: string` nas props
- Repassar para `ProjectView`
- Quando `module === 'crm'`: nao renderizar `AcordosView` nem `SectorView` (sub-views juridicas)

**3. ProjectView.tsx**
- Nova prop: `module?: string`
- Quando `module === 'crm'`:
  - **Esconder** `SetoresDropdown` (linha ~1104)
  - **Esconder** `ProjectWorkspaceTabs` (linha ~1126)
  - **Esconder** abas "Processos" e "Casos" (linhas ~1140-1167), ir direto para "Colunas" como unica aba visivel
  - **Esconder** `CreateSectorDialog`
  - **Trocar estetica** do Kanban: ao inves de usar `KanbanColumn` (borda colorida a esquerda, card alto), usar o estilo visual do `WhatsAppKanban` (fundo `bg-muted/50 rounded-lg`, bolinha colorida no header, sem borda lateral, mais compacto)
  - O `activeTab` pode iniciar como `'colunas'` diretamente (sem as tabs)

**Estetica das colunas CRM vs Vouti:**

Vouti (atual):
- `KanbanColumn.tsx`: Card com `borderLeft: 4px solid color`, fundo `color+20`, altura fixa `calc(100vh-200px)`, largura `250px`

CRM (desejado):
- Coluna com `bg-muted/50 rounded-lg p-3`, bolinha colorida (`w-2.5 h-2.5 rounded-full`) ao lado do nome, badge de contagem, sem borda lateral colorida, `w-64`

A implementacao vai renderizar condicionalmente as colunas: se `module === 'crm'`, usar divs estilizadas como no `WhatsAppKanban`; caso contrario, manter o `KanbanColumn` existente.

