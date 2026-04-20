
## Ajustar novamente o visual do topo — tenant `demorais`

### Causa raiz
A implementação atual ficou no meio-termo errado:
- `DashboardLayout.tsx` ainda aplica `border-b` no `<header>` do `demorais`.
- `DashboardSidebar.tsx` ainda aplica `border-b` no bloco do logo e `border-r` no `<aside>`.
- Resultado: continuam existindo linhas/divisórias, quando o que você pediu agora é o oposto: **topbar horizontal fixa, clara, flat, contínua, sem bordas e sem separação visual da sidebar**.

### Correção

**1. `DashboardLayout.tsx` — deixar o header realmente liso no `demorais`**
- Manter a lógica condicional por tenant: `tenantSlug === 'demorais'`.
- Para o `demorais`, o `<header>` deve ficar com classes no estilo:
  - `sticky top-0 z-30 h-[52px] bg-background`
- Remover do branch do `demorais`:
  - `border-b`
  - `border-border/60`
  - `glass-surface`
- Os demais tenants continuam exatamente como hoje.

**2. `DashboardSidebar.tsx` — remover qualquer separação entre logo e topbar no `demorais`**
- Continuar usando `flatTopbar` para o `demorais`.
- No `<aside>`:
  - manter `bg-background`
  - remover `border-r` quando `flatTopbar === true`
- No container do logo:
  - remover `border-b` quando `flatTopbar === true`
- Isso elimina:
  - linha lateral ao lado da logo
  - linha abaixo da logo
  - qualquer “quebra” entre sidebar e topbar

**3. Manter o layout contínuo e clean**
- Sidebar e topbar ficam com o mesmo fundo (`bg-background`) e mesma altura/alinhamento no topo.
- O bloco do logo passa a parecer parte da própria topbar, não uma caixa separada.
- O conteúdo principal segue abaixo/ao lado normalmente; se precisar contraste, isso pode ser ajustado depois no content area, sem recolocar bordas no topo.

**4. Preservar o teste só no tenant `demorais`**
- Não transformar em padrão global ainda.
- Continuar passando `flatTopbar={tenantSlug === 'demorais'}` para o sidebar.
- Outros tenants seguem com:
  - `glass-surface`
  - `border-b` no header
  - `border-r` no sidebar

### Arquivos afetados
- `src/components/Dashboard/DashboardLayout.tsx`
  - ajustar o branch visual do `demorais` para header liso, sem borda.
- `src/components/Dashboard/DashboardSidebar.tsx`
  - condicionar `border-r` do sidebar a `!flatTopbar`
  - condicionar `border-b` do bloco do logo a `!flatTopbar`

### Impacto
- **Usuário final (UX)**: no tenant `demorais`, o topo vai ficar exatamente no estilo que você descreveu agora: uma faixa contínua, clara e flat, sem linhas laterais, sem linha sob a logo, sem separação entre sidebar e topbar. A navegação fica visualmente mais limpa e mais próxima da referência.
- **Dados**: nenhuma mudança em banco, migrations, RLS, queries ou performance de dados. É ajuste puramente visual.
- **Riscos colaterais**:
  - o layout pode ficar “limpo demais” e reduzir contraste entre navegação e conteúdo; se isso acontecer, o ajuste certo depois é no fundo do conteúdo, não recolocando bordas no topo.
  - no modo escuro, a falta de divisórias pode exigir revisão fina de contraste.
- **Quem é afetado**: apenas usuários do tenant `demorais` nas rotas do Dashboard. Outros tenants não mudam.

### Validação
1. Abrir `/demorais/dashboard`.
2. Confirmar que o topbar está fixo, com fundo claro e **sem borda inferior**.
3. Confirmar que **não existe linha lateral ao lado da logo**.
4. Confirmar que **não existe linha abaixo da logo**.
5. Confirmar que sidebar e topbar parecem uma única faixa contínua.
6. Conferir que outros tenants continuam com o visual antigo.
7. Testar com sidebar recolhida para garantir que o topo continua contínuo.
8. Validar em tema claro e escuro para checar contraste.
