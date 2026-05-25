## Causa raiz

**1) Drawer não abre após pesquisa (mobile)**
Em `DashboardLayout.tsx`, ao clicar num resultado dentro do `Sheet` mobile (busca rápida):
```ts
setMobileSearchOpen(false);
handleQuickProjectSelect(pid);  // setProjectDrawerOpen(true)
```
O `Sheet` da busca é modal — quando fecha, o Radix Dialog injeta `pointer-events:none` no `body` e está animando saída. O `ProjectDrawer` é `modal={false}` com `side="inset"` e abre no mesmo tick, ficando preso atrás do estado de cleanup do Sheet anterior. Resultado: o drawer monta, mas o overlay/foco fica órfão e o usuário não vê nada (ou enxerga um piscar e ele "fecha").

**2) Visual do Projeto no mobile**
`ProjectDrawerContent` envolve tudo em `container max-w-7xl mx-auto px-6 py-8` — em 390px isso consome ~48px de padding lateral + 32px vertical à toa. O `ProjectView` foi escrito só para desktop: header de projeto com botões em uma linha, abas inline (`text-sm` sem scroll), kanban com colunas `w-64` fixas, search "max-w-md". Nada com `md:` ou `useIsMobile`.

**3) Visual dos Protocolos no mobile**
`ProjectProtocoloContent` (880 linhas) usa `grid grid-cols-2 gap-4` para cards de info, padding desktop, comentários e etapas com layout horizontal. No mobile fica tudo espremido — informações, comentários e anexos viram blocos minúsculos de difícil leitura.

## Correção

### 1) Bug do drawer (rápido)
Em `DashboardLayout.tsx`, dentro do `Sheet` mobile de busca:
- Abrir o drawer ANTES de fechar o sheet, e atrasar o `setMobileSearchOpen(false)` em um tick (`requestAnimationFrame`) para que o cleanup do Sheet modal não atropele o mount do `ProjectDrawer`.
- O mesmo para o handler de `onSelectProtocolo`.

### 2) Redesign mobile do Projeto
Aplicar `useIsMobile()` e ajustes responsivos sem mexer em lógica:

**`ProjectDrawerContent.tsx`**
- Container: `px-3 py-3 md:px-6 md:py-8` e remover `max-w-7xl` no mobile (`md:max-w-7xl md:mx-auto`).

**`ProjectView.tsx`** (header e abas)
- Header: stack vertical no mobile (`flex-col md:flex-row`), título `text-base md:text-xl`, botões de ação viram ícones (sem texto) numa linha rolável (`overflow-x-auto`).
- Workspaces tabs: `overflow-x-auto` + `whitespace-nowrap` + `snap-x` para rolar lateralmente.
- Tabs principais (Protocolos / Casos / Colunas): mesma faixa rolável, padding maior (`py-2.5`).
- Search: `w-full` no mobile (sem `max-w-md`).
- Kanban: colunas `w-[80vw] max-w-[18rem] md:w-64`, `snap-x snap-mandatory md:snap-none`, padding reduzido.

### 3) Redesign mobile dos Protocolos
**`ProjectProtocoloContent.tsx`**
- Container interno: padding compacto no mobile.
- Cards de informação: `grid grid-cols-1 md:grid-cols-2` (empilha no mobile, lado a lado no desktop).
- Header do protocolo: stack vertical, título quebra em 2 linhas, badges em wrap, botões de ação como linha rolável de ícones.
- Bloco de comentários: largura total, avatar menor (`h-7 w-7`), texto `text-sm` com `leading-relaxed`, input fixo no rodapé do scroll (sticky bottom) para não perder foco.
- Anexos: lista vertical com thumbnail + nome + tamanho, em vez de grid apertado.
- Etapas: cards full-width com responsável + data em linha separada do título.

Nenhuma mudança em hooks de dados, RPC, RLS ou queries.

## Arquivos afetados
- `src/components/Dashboard/DashboardLayout.tsx` — fix ordem de abertura/fechamento na busca mobile.
- `src/components/Project/ProjectDrawerContent.tsx` — padding/container responsivo.
- `src/pages/ProjectView.tsx` — header, tabs, search e kanban responsivos (mudanças localizadas, sem refatorar lógica).
- `src/components/Project/ProjectProtocoloContent.tsx` — grid de info, comentários, anexos e etapas em layout mobile.

## Impacto
1. **Usuário final (UX)**: no mobile, busca rápida agora abre o drawer do projeto corretamente. A tela do projeto deixa de ter texto cortado/colunas grudadas — abas e workspaces rolam de lado, kanban faz snap, informações respiram. No protocolo, informações, comentários e anexos viram blocos legíveis em coluna única, com input de comentário sempre acessível. Desktop fica visualmente idêntico.
2. **Dados**: zero. Sem migration, sem RLS, sem mudança de query.
3. **Riscos colaterais**: as mudanças em `ProjectView` tocam classes Tailwind em pontos sensíveis (kanban com drag-and-drop); risco é apenas visual e o `react-beautiful-dnd` não depende de largura fixa. Sticky bottom do input de comentário precisa respeitar o `MobileBottomNav` (z-index e bottom-padding).
4. **Quem é afetado**: todos os usuários acessando Planejamento de Projetos / Protocolos pelo mobile (qualquer tenant, qualquer role). Desktop não muda.

## Validação
- Mobile 390px → topbar → lupa → buscar "demo" → clicar projeto: drawer abre fullscreen.
- Mesma busca → clicar protocolo: drawer abre já no protocolo certo.
- Dentro do projeto: abas e workspaces rolam de lado sem quebrar; kanban faz snap entre colunas; header não estoura.
- Dentro do protocolo: cards de info empilham, comentários ficam legíveis, input fica acessível ao teclado, anexos em lista.
- Desktop ≥768px: layout idêntico ao atual em projeto e protocolo.