

# Planejador: Botão X, Configurações, Cadeado e Sidebar/Topbar Collapsível

## Contexto

O Planejador atualmente usa `side="right"` com fullscreen, cobrindo sidebar e topbar completamente. Todos os outros drawers usam `side="inset"` que respeita sidebar/topbar. Precisamos manter o visual espacial do Planejador mas permitir ver sidebar/topbar quando desejado.

## Mudanças

### 1. Botão X para fechar (`PlanejadorTopBar.tsx`)
- Adicionar prop `onClose` e renderizar um botão X minimalista no canto direito da top bar

### 2. Ícone de Configuração (engrenagem) (`PlanejadorTopBar.tsx` + novo `PlanejadorSettings.tsx`)
- Ícone `Settings` ao lado esquerdo da barra de pesquisa
- Ao clicar, abre um painel/sheet lateral dentro do drawer com:
  - Lista de colunas com nome editável (usando `EditableColumnName` existente como referência)
  - Drag & drop para reordenar colunas
  - Toggle de visibilidade por coluna
- State de configuração das colunas salvo em `localStorage` (por tenant) e passado ao Kanban

### 3. Ícone de Cadeado (`PlanejadorTopBar.tsx`)
- Ícone `Lock`/`Unlock` ao lado da engrenagem
- Quando travado: drag & drop entre colunas desabilitado (não pode mover tarefas)
- Quando destravado: comportamento normal
- Padrão: destravado

### 4. Sidebar/Topbar com seta collapsível (`PlanejadorDrawer.tsx`)
- Mudar o Planejador de `side="right"` fullscreen para `side="inset"` (padrão do projeto)
- Isso automaticamente mostra sidebar e topbar, já que `inset` respeita o layout
- Adicionar uma seta minimalista (tipo `ChevronLeft`/`ChevronRight` em linha fina) no canto superior esquerdo do drawer
- Ao clicar, o drawer muda temporariamente para fullscreen (CSS: `left: 0, top: 0`) cobrindo sidebar/topbar
- Ao clicar novamente, volta ao `inset` mostrando sidebar/topbar
- O fundo espacial se mantém em ambos os modos

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `PlanejadorDrawer.tsx` | Usar `side="inset"`, state de fullscreen toggle, passar props novas ao TopBar e Kanban |
| `PlanejadorTopBar.tsx` | Botão X (onClose), ícone Settings, ícone Lock/Unlock, seta expand/collapse |
| `PlanejadorSettings.tsx` | **Novo** — Painel de configurações de colunas (renomear, reordenar, visibilidade) |
| `PlanejadorKanban.tsx` | Receber `locked` prop para desabilitar drag & drop; receber `columnConfig` para ordem/nomes customizados |
| `usePlanejadorTasks.ts` | Exportar `KANBAN_COLUMNS` com suporte a override de labels/ordem |

### Detalhe técnico: Configuração de colunas

```typescript
interface ColumnConfig {
  id: KanbanColumn;
  label: string;     // nome customizado
  visible: boolean;
  order: number;
}
```

Salvo em `localStorage` key `planejador-column-config-{tenantId}`. Se não existir, usa `KANBAN_COLUMNS` padrão. O `PlanejadorSettings` permite editar in-place com drag para reordenar.

### Detalhe técnico: Modo inset vs fullscreen

O drawer usará `side="inset"` por padrão. O state `isExpanded` controla uma classe CSS extra que faz `position: fixed; inset: 0;` sobrepondo sidebar/topbar. Uma seta minimalista (`ChevronRight` quando expandido, `ChevronLeft` quando colapsado) no canto permite alternar.

