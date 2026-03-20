

# 4 mudanças no Planejador, Chat e Topbar

## 1. Botão Configurações → Menu com opções (não só colunas)

Atualmente o botão engrenagem abre direto o painel de colunas. Mudar para abrir um dropdown/popover com opções, sendo "Configurar Colunas" a primeira opção.

**Arquivo:** `PlanejadorTopBar.tsx`
- Trocar o `<button onClick={onOpenSettings}>` por um `DropdownMenu` com itens:
  - "Configurar Colunas" (ícone Columns) → chama `onOpenSettings`
  - (espaço para futuras opções)

## 2. Task Detail abrindo atrás do Drawer

O `PlanejadorTaskDetail` usa `z-50` mas o Sheet inset pode ter z-index maior. O componente é renderizado fora do Sheet (no JSX do `PlanejadorDrawer`, após `</Sheet>`).

**Arquivo:** `PlanejadorDrawer.tsx`
- Mover o `{selectedTask && <PlanejadorTaskDetail .../>}` para **dentro** do `<SheetContent>`, dentro do div com `relative z-10`, após o Kanban
- Alternativamente, aumentar o z-index do TaskDetail para `z-[70]`

**Arquivo:** `PlanejadorTaskDetail.tsx`
- Mudar `z-50` para `z-[70]` para garantir que fique acima do drawer em qualquer caso

## 3. Fundo WhatsApp no chat da tarefa

Adicionar o mesmo padrão SVG sutil usado no CRM (`ChatPanel.tsx`) como fundo da área de mensagens do bate-papo.

**Arquivo:** `PlanejadorTaskChat.tsx`
- Na div `flex-1 overflow-y-auto p-4 space-y-3` (área de mensagens), adicionar:
  - `style={{ backgroundImage: ... }}` com o mesmo padrão SVG do ChatPanel
  - Classe `bg-green-50/30 dark:bg-transparent` para tom suave no light mode

## 4. Botão Perfil com dropdown no lugar do "Sair"

Substituir o botão "Sair" na topbar do `DashboardLayout` por um ícone de avatar/perfil que abre um dropdown inspirado na imagem de referência (estilo Bitrix24).

**Arquivo:** `DashboardLayout.tsx`
- Remover o `<Button>Sair</Button>` (linhas 403-406)
- Adicionar um `DropdownMenu` com trigger sendo um avatar circular (usando `Avatar` + iniciais do usuário ou `UserCircle` icon)
- Conteúdo do dropdown:
  - Header: nome do usuário + role badge (ex: "Administrador")
  - Separador
  - "Tema visual" → chama ThemeToggle (mover o ThemeToggle para dentro do dropdown)
  - Separador
  - "Sair" com ícone LogOut → chama `handleLogout`
- Apenas ícone, sem texto "Perfil" visível

**Componentes usados:** `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel`, `Avatar`, `AvatarFallback`

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `PlanejadorTopBar.tsx` | Engrenagem → DropdownMenu com "Configurar Colunas" como item |
| `PlanejadorTaskDetail.tsx` | z-index de `z-50` para `z-[70]` |
| `PlanejadorTaskChat.tsx` | Fundo estilo WhatsApp na área de mensagens |
| `DashboardLayout.tsx` | Botão Sair → Avatar dropdown com nome, role, tema, sair |

