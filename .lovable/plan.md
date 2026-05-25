# Correções mobile: deadline detail, bottom nav e busca rápida

## Causa raiz

1. **Prazo não abre**: `DeadlineDetailDialog` usa o `Dialog` padrão do shadcn, que renderiza no `z-50`. No mobile, o `PlanejadorDrawer` foi configurado para abrir fullscreen com `z-[60]`. O dialog do prazo é renderizado por trás do overlay do Planejador — ele abre mas fica invisível. Vale também para o `DeadlineDetailDialog` dentro do `DashboardLayout` se houver outro overlay ativo.
2. **Botão Planejador escondido em "Mais"**: na rodada anterior coloquei `planejador` em `MORE_ITEMS`. O usuário quer ele visível direto na barra inferior, no lugar de **Projetos** (já que Projetos pode viver no menu "Mais").
3. **Lupa do topbar não faz nada útil no mobile**: hoje o ícone de lupa no header (`GlobalSearch`) abre uma busca genérica. No desktop existe o `ProjectQuickSearch` (busca rápida de projetos + protocolos) que está `hidden md:flex` — invisível no mobile. O usuário quer que a lupa do mobile dispare exatamente a busca rápida de projetos/protocolos.

## Correção

### 1. Z-index do DeadlineDetailDialog no mobile
- Em `src/components/Agenda/DeadlineDetailDialog.tsx`: aumentar o `z-index` do `DialogContent` para `z-[70]` (acima do drawer do Planejador que está em `z-[60]`). Aplicar via className (`className="... z-[70]"`).
- Como o `Dialog` do shadcn também usa um overlay (z-50), passar a classe no overlay também. Alternativa cirúrgica: usar `className="z-[70]"` no `DialogContent` — o overlay subjacente do Radix herda `z-50` por padrão, mas o content fica clicável acima do drawer. Validar que o backdrop escuro não esconde nada essencial. Se o overlay do dialog continuar atrás, alternativa B: subir overlay também com um wrapper customizado (já existem variantes em ui/dialog.tsx).

### 2. Bottom nav: trocar Projetos por Planejador
- Em `src/components/Dashboard/MobileBottomNav.tsx`:
  - `PRIMARY_TABS`: trocar `{ id: 'projetos', icon: FolderOpen, label: 'Projetos' }` por `{ id: 'planejador', icon: LayoutGrid, label: 'Planejador' }`.
  - `MORE_ITEMS`: remover o `planejador` que adicionei na rodada anterior e adicionar `{ id: 'projetos', icon: FolderOpen, label: 'Projetos' }` no topo da lista do "Mais".
  - `hasAccessToItem`: continuar tratando `planejador` como sempre visível (já feito). Para `projetos`, manter regra existente.

### 3. Lupa mobile = busca rápida de projetos/protocolos
- Em `src/components/Dashboard/DashboardLayout.tsx`:
  - O `GlobalSearch` no header passa a ser `hidden md:inline-flex` (continua só no desktop, junto com o `ProjectQuickSearch` desktop).
  - Adicionar um novo botão de lupa visível apenas no mobile (`md:hidden`) que abre um `Sheet` (side="top" ou full overlay) contendo o `ProjectQuickSearch` renderizado em modo full-width. O `ProjectQuickSearch` já usa portal para o dropdown — basta envolvê-lo em um Sheet/Dialog e ele funcionará. Os handlers `onSelectProject` e `onSelectProtocolo` já existem no DashboardLayout (linhas 421-431), passar os mesmos para o novo wrapper mobile e fechar o Sheet ao selecionar.

## Arquivos afetados

- `src/components/Agenda/DeadlineDetailDialog.tsx` — z-index do DialogContent
- `src/components/Dashboard/MobileBottomNav.tsx` — Planejador na primary bar, Projetos vai pro "Mais"
- `src/components/Dashboard/DashboardLayout.tsx` — esconde GlobalSearch no mobile, adiciona Sheet mobile com ProjectQuickSearch

## Impacto

- **Usuário final (UX)**: (a) Clicar em um prazo no Planejador (mobile) finalmente abre o dialog de detalhes visivelmente. (b) Botão Planejador acessível em 1 toque na barra inferior (era 2 toques via "Mais"). Projetos vira 2 toques. (c) A lupa do topbar mobile agora abre a busca rápida (igual desktop) que lista projetos e protocolos com navegação direta.
- **Dados (migrations, RLS, performance)**: nenhuma alteração.
- **Riscos colaterais**: baixo. (1) Subir z-index do DeadlineDetailDialog pode afetar interação com outros overlays que apareçam acima dele — pouco provável já que `z-[70]` é raro. (2) Trocar a ordem dos tabs muda o "muscle memory" de quem já usava Projetos no mobile, mas o item continua acessível em "Mais". (3) O `ProjectQuickSearch` dentro de Sheet usa `createPortal` para o dropdown — validar se o dropdown aparece acima do Sheet (provavelmente sim, pois portal vai para o body).
- **Quem é afetado**: todos os tenants/roles que usam o app no mobile.

## Validação

1. Mobile 390px → Planejador → tab "Prazos" → tocar em um card → dialog de detalhe abre visível e interativo.
2. Mobile 390px → barra inferior mostra "Planejador" no lugar de "Projetos"; tocar leva direto ao drawer. Em "Mais" aparece "Projetos".
3. Mobile 390px → tocar na lupa no header → abre Sheet com input de busca; digitar nome de projeto/protocolo → resultados aparecem → tocar navega corretamente e fecha o Sheet.
4. Desktop ≥768px: nenhuma mudança visível (ProjectQuickSearch desktop continua no header, GlobalSearch continua à direita).
