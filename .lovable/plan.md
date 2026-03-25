

# Criar visualização em Lista no Planejador

## Contexto
A aba "Lista" já existe no TopBar (tabs: Colunas, Lista, Calendário), mas atualmente não renderiza nada diferente. O objetivo é criar uma visualização em tabela quando `activeTab === 'lista'`, conforme a imagem de referência.

## O que será construído

Uma tabela com as colunas: **Nome**, **Atividade** (status/coluna), **Prazo final**, **Criado por**, **Responsável**, **Projeto**, **Marcadores**. Inclui checkboxes para seleção, ações em lote, paginação e contagem.

## Arquivos envolvidos

### 1. Criar `src/components/Planejador/PlanejadorListView.tsx`
Componente de tabela que recebe as mesmas props do Kanban (tasksByColumn, filtros, labels, etc.) e exibe todas as tarefas em formato tabular:
- Header com colunas: checkbox, Nome, Atividade (nome da coluna kanban), Prazo final, Criado por, Responsável, Projeto, Marcadores
- Linhas clicáveis que abrem o detalhe da tarefa (mesmo `onTaskClick`)
- Prazo vencido destacado em vermelho/badge como na imagem
- Avatares com nome para "Criado por" e "Responsável" (busca em profiles)
- Marcadores como badges coloridos
- Barra inferior com: contagem de selecionados, total, paginação, selector de registros por página (50 default)
- Ações em lote: dropdown "Selecionar Ação" + botão "Aplicar" + checkbox "Para Todos"
- Respeitar filtros ativos (usuário, labels, busca)
- Aplicar mesma filtragem que o Kanban usa
- Visual com fundo glass (consistente com o tema do Planejador)

### 2. Modificar `src/components/Planejador/PlanejadorDrawer.tsx`
- Importar `PlanejadorListView`
- No bloco de renderização condicional (linha ~257-276), alternar entre `PlanejadorKanban` e `PlanejadorListView` baseado em `activeTab`:
  - `activeTab === 'prazo'` → renderiza Kanban
  - `activeTab === 'lista'` → renderiza ListView
  - Outros tabs mantêm comportamento atual

## Detalhes técnicos
- Achatar `tasksByColumn` em array único, preservando a info de qual coluna cada task pertence (para a coluna "Atividade")
- Usar os mesmos filtros de busca/usuário/labels já existentes
- Buscar nomes de profiles via query existente `tenant-profiles`
- Paginação client-side com estado local (page, pageSize)
- Checkbox state gerenciado localmente no componente

