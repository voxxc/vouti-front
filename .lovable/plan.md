

## Drawer de Projetos com Largura Similar ao Vouti

### Problema atual
Ao clicar em "Projetos" no CRM, o conteudo e renderizado ocupando toda a area principal do drawer (que e `inset`, tela inteira). O usuario quer que abra um drawer separado com largura semelhante ao do Vouti dashboard, que usa `side="left-offset"` com `w-96` (384px).

### Solucao

Transformar a secao "Projetos" do CRM em um **sub-drawer (Sheet)** que abre por cima do conteudo, com largura fixa similar ao Vouti. Ao clicar em um projeto, o drawer expande para mostrar o `ProjectDrawerContent` com largura maior (para acomodar Kanban, setores, etc).

### Comportamento

1. Clicar em "Projetos" na sidebar do CRM abre um **Sheet separado** (nao substitui o conteudo principal)
2. O Sheet aparece com largura `w-96` mostrando a lista de projetos (identico ao Vouti)
3. Ao selecionar um projeto, o drawer expande para largura maior (`w-[900px]` ou similar) para exibir o `ProjectDrawerContent` completo
4. A Inbox continua ativa em segundo plano (comportamento atual preservado)

### Detalhes tecnicos

**Arquivo: `WhatsAppProjects.tsx`**
- Envolver todo o conteudo em um componente `Sheet` proprio com `side="left-offset"`
- Receber props `open` e `onOpenChange` para controlar abertura/fechamento
- Quando um projeto e selecionado, trocar a classe de largura do `SheetContent` de `w-96` para `w-[900px]` (transicao suave)
- Manter a mesma logica interna de lista vs detalhes

**Arquivo: `WhatsAppDrawer.tsx` e `WhatsAppLayout.tsx`**
- Ao inves de renderizar `WhatsAppProjects` como secao inline, abrir como drawer sobreposto
- Controlar estado `projectsDrawerOpen` separadamente
- A secao ativa NAO muda para "projects" (a inbox ou secao atual continua visivel por baixo)

**Arquivo: `WhatsAppSidebar.tsx`**
- O botao "Projetos" em vez de mudar `activeSection`, dispara a abertura do drawer de projetos via callback `onOpenProjects`

### Resumo dos arquivos

| Arquivo | Acao |
|---|---|
| `WhatsAppProjects.tsx` | Reescrever como Sheet autonomo com largura `left-offset`, expansivel ao selecionar projeto |
| `WhatsAppDrawer.tsx` | Adicionar estado `projectsDrawerOpen`, renderizar `WhatsAppProjects` como Sheet separado |
| `WhatsAppLayout.tsx` | Mesmo ajuste para a versao fullscreen |
| `WhatsAppSidebar.tsx` | Botao "Projetos" dispara `onOpenProjects` ao inves de `onSectionChange("projects")` |

