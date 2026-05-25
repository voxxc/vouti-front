## Causa raiz

A Controladoria foi pensada para desktop. No mobile (390px):

1. **KPIs gigantes** — grid `grid-cols-2` força cada card a >180px de altura com ícone+label+número empilhados, ocupando ~40% da tela só nos 5 KPIs.
2. **Tabs principais** (`Central / OABs / Push-Doc`) — usam `apple-tab-bar` sem scroll horizontal, apertando o texto.
3. **Central** — sub-tabs (`Andamentos Não Lidos / Prazos Concluídos / Subtarefas / Indicadores`) com labels longos quebram linha e empilham mal.
4. **OABs** — header `Cadastrar OAB` + badge + ações ficam apertados; toolbar de cada OAB tem 4 botões com texto numa linha só; tabs por OAB sem scroll confortável.
5. **Push-Doc** — `TabsList` + botão "Adicionar Termo" disputam espaço; cards dos docs com 4 metadados inline (`Recorrência · Processos · Última`) quebram feio; bloco "Processos Recebidos" empurra tudo pra baixo.

## Correção

### 1. KPIs (`ControladoriaContent.tsx` + `Controladoria.tsx`)

Trocar grid por **carrossel horizontal de chips compactos** no mobile (`<md`), mantendo grid 5 colunas no desktop:

- Mobile: `flex overflow-x-auto snap-x` com chips de ~140px largura, ícone à esquerda + label pequeno + número grande à direita, altura ~64px.
- Desktop: layout atual preservado.

### 2. Tabs principais (Central / OABs / Push-Doc)

- Adicionar `overflow-x-auto` ao `apple-tab-bar` no mobile e reduzir padding/tipo (`text-xs px-3` no mobile).
- Manter visual desktop.

### 3. Central (`CentralControladoria.tsx`)

- `apple-tab-bar` com scroll horizontal.
- Encurtar labels no mobile: "Andamentos Não Lidos" → "Andamentos", "Prazos Concluídos" → "Prazos", manter "Subtarefas" e "Indicadores".
- Badge de contagem permanece colado ao label.

### 4. OABs (`OABManager.tsx`)

- **Header**: empilhar título + ações no mobile (`flex-col` ou `flex-wrap`); botão "Cadastrar OAB" vira ícone-only no mobile.
- **Tabs por OAB**: já tem `overflow-x-auto`; reduzir padding no mobile e aumentar gap entre chips.
- **Toolbar da OAB selecionada**:
  - Mobile: linha 1 = OAB + advogado + editar; linha 2 = botões em grid 3 colunas (Planilha / CNJ / Excluir), ícone+label compacto.
  - Desktop: mantém layout atual.

### 5. Push-Doc (`PushDocsManager.tsx`)

- **Header**: `TabsList` ocupa largura total no mobile (`grid grid-cols-3 w-full`), botão "Adicionar Termo" desce pra linha de baixo (ícone+texto curto "Adicionar").
- **PushDocCard**: empilhar verticalmente no mobile — documento+status na linha 1, descrição na 2, metadados em chips `flex-wrap gap-2` com tamanho consistente. Ações (pause/play/delete) viram dropdown `MoreHorizontal` no mobile pra não disputar espaço.
- **Processos Recebidos**: collapse no mobile (mostrar contagem + botão "Ver" que abre sheet), evitando empurrar a lista principal.

### 6. Drawer (`ControladoriaDrawer.tsx`)

- Garantir padding compatível (`p-3 md:p-6` já está ok); nada a mudar.

## Arquivos afetados

- `src/pages/Controladoria.tsx` — KPIs responsivos, tabs com scroll.
- `src/components/Controladoria/ControladoriaContent.tsx` — KPIs responsivos (versão drawer).
- `src/components/Controladoria/CentralControladoria.tsx` — sub-tabs com scroll e labels curtos.
- `src/components/Controladoria/OABManager.tsx` — header e toolbar da OAB responsivos.
- `src/components/Controladoria/PushDocsManager.tsx` — header, card e bloco "Processos Recebidos" responsivos.

## Impacto

**1. Usuário final (UX)**
- Mobile: KPIs viram um carrossel compacto, sub-tabs e ações ficam acessíveis com 1 toque, cards respiram. Conteúdo principal (listas) aparece já no primeiro scroll.
- Desktop: **nenhuma mudança visual** — todos os ajustes são `md:` específicos.

**2. Dados / Backend**
- Nenhuma alteração de schema, RLS, query ou edge function. Mudança 100% de presentation.

**3. Riscos colaterais**
- Apenas regressão visual em telas estreitas (<360px) — testar em iPhone SE.
- Dropdown de ações no PushDocCard mobile adiciona 1 click vs hoje; aceitável dado o ganho de respiro.

**4. Afetados**
- Todos os tenants que abrem Controladoria em mobile (admin, controller, advogado, financeiro). Desktop intocado.

## Validação

- Abrir `/demorais/dashboard` → Controladoria em 390x844 e verificar:
  - KPIs em carrossel horizontal compacto.
  - Tabs Central/OABs/Push-Doc com scroll suave.
  - Central: sub-tabs em linha única com scroll.
  - OABs: toolbar empilhada, botões legíveis.
  - Push-Doc: cards verticais, dropdown de ações.
- Repetir em 1280x720 → tudo idêntico ao atual.
