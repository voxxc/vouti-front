
## Implementar Sistema de Projetos no Vouti.CRM

### O que sera feito

Adicionar um botao "Projetos" na sidebar do CRM (WhatsAppSidebar) que, ao ser clicado, abre uma nova secao `"projects"` no painel principal. Essa secao exibe a lista de projetos (reutilizando a logica do `ProjectsDrawer`) e, ao clicar em um projeto, carrega o conteudo completo do projeto (reutilizando o `ProjectDrawerContent`) -- tudo dentro do drawer do CRM, sem abrir drawers extras.

O fluxo segue o padrao interno de navegacao ja usado no CRM (estados locais para alternar entre views).

### Fluxo do usuario

```text
Sidebar CRM                    Painel Principal
+-------------------+          +----------------------------------+
| Caixa de Entrada  |          |                                  |
| Conversas         |          |  [Lista de Projetos]             |
| Kanban CRM        |          |  - Buscar projetos...            |
| Contatos          |          |  - Projeto A  >                  |
| Relatorios        |          |  - Projeto B  >                  |
| Campanhas         |          |  - Projeto C  >                  |
| >> Projetos <<    | -------> |                                  |
| Central de Ajuda  |          +----------------------------------+
| Configuracoes     |
+-------------------+

Ao clicar em "Projeto A":

+-------------------+          +----------------------------------+
|                   |          | [<- Voltar]                      |
| >> Projetos <<    |          | ProjectView completo do          |
|                   |          | projeto selecionado              |
|                   |          | (Kanban, setores, tarefas, etc)  |
+-------------------+          +----------------------------------+
```

### Detalhes tecnicos

**1. Adicionar secao "projects" ao tipo `WhatsAppSection`**

No `WhatsAppDrawer.tsx`, adicionar `"projects"` ao union type `WhatsAppSection`.

**2. Adicionar botao "Projetos" na sidebar**

No `WhatsAppSidebar.tsx`, adicionar um botao com icone `FolderOpen` entre "Campanhas" e "Central de Ajuda", que ativa a secao `"projects"`.

**3. Criar componente `WhatsAppProjects.tsx`**

Novo arquivo em `src/components/WhatsApp/sections/WhatsAppProjects.tsx` que:
- Carrega a lista de projetos do tenant (reutilizando `useProjectsOptimized`)
- Exibe campo de busca + lista de projetos (similar ao `ProjectsDrawer`)
- Permite criar novo projeto inline
- Ao clicar em um projeto, alterna para a view de detalhes usando `ProjectDrawerContent` (que ja possui toda a logica de ProjectView, AcordosView e SectorView internamente)
- Botao "Voltar" para retornar a lista

**4. Registrar a secao nos drawers**

No `WhatsAppDrawer.tsx` e `WhatsAppLayout.tsx`, adicionar o case `"projects"` no `renderSection` / `renderOtherSection` para renderizar `WhatsAppProjects`.

### Resumo dos arquivos

| Arquivo | Acao |
|---|---|
| `src/components/WhatsApp/WhatsAppDrawer.tsx` | Adicionar `"projects"` ao tipo; renderizar `WhatsAppProjects` |
| `src/components/WhatsApp/WhatsAppLayout.tsx` | Adicionar case `"projects"` no render |
| `src/components/WhatsApp/WhatsAppSidebar.tsx` | Adicionar botao "Projetos" com icone `FolderOpen` |
| `src/components/WhatsApp/sections/WhatsAppProjects.tsx` | **Novo** -- lista de projetos + view de detalhes do projeto |

### Componentes reutilizados

- `useProjectsOptimized` -- hook de carregamento progressivo de projetos
- `ProjectDrawerContent` -- conteudo completo do projeto (ProjectView, AcordosView, SectorView)
- Nao inclui "Casos" pois o `ProjectDrawerContent` ja trata isso internamente sem dependencias externas

### Sem CASOS

Conforme solicitado, a secao de Casos nao sera incluida. O `ProjectView` ja funciona sem ela pois e uma aba opcional dentro do projeto.
