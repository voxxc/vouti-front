

## Ajuste: linha horizontal contínua abaixo do logo + topbar (tenant `demorais`)

### Reinterpretação correta da referência
Na imagem Astrea, existe **uma linha horizontal contínua** que atravessa a tela inteira, logo abaixo da altura do logo/topbar. Ela separa visualmente:
- **Faixa superior** = bloco do logo (esquerda) + topbar (direita), mesmo fundo, mesma altura, **conectados sem divisor vertical entre eles**
- **Faixa inferior** = itens do sidebar (esquerda) + conteúdo principal (direita)

O que fiz antes foi **remover** essa linha. O correto é **manter** a linha embaixo do logo E garantir que o topbar tenha a mesma linha embaixo, alinhadas, formando um divisor único.

### Estado atual após última mudança
- `DashboardSidebar.tsx` (flatTopbar=true): bloco do logo SEM `border-b` ❌ (deveria ter)
- `DashboardLayout.tsx` (demorais): `<header>` SEM `border-b` ❌ (deveria ter)
- Resultado visual: nenhuma linha → cabeçalho "flutua" sem separação do conteúdo.

### Correção

**1. `DashboardSidebar.tsx` — restaurar `border-b` no bloco do logo mesmo quando `flatTopbar`**
- Remover a condicional `!flatTopbar &&` da linha do logo.
- O `border-b border-border/60` volta a ser aplicado SEMPRE (independente do flatTopbar).
- O fundo continua `bg-background` (não `glass-surface`) quando flatTopbar — para fundir com o topbar.

**2. `DashboardLayout.tsx` — restaurar `border-b` no `<header>` quando `demorais`**
- A classe condicional do header passa a ser:
  - `demorais`: `"sticky top-0 z-30 h-[52px] bg-background border-b border-border/60"`
  - outros: `"sticky top-0 z-30 h-[52px] border-b glass-surface"` (inalterado)
- Assim a linha do header se alinha perfeitamente com a linha do logo no sidebar (ambas em `top: 52px`), criando o divisor horizontal contínuo da referência.

**3. Garantir alinhamento de altura**
- Logo block: `h-[52px]` ✅ (já é)
- Header: `h-[52px]` ✅ (já é)
- As duas bordas ficam exatamente na mesma linha Y → divisor contínuo.

### Arquivos afetados
- `src/components/Dashboard/DashboardSidebar.tsx` — remover condicional `!flatTopbar`, deixar `border-b` sempre.
- `src/components/Dashboard/DashboardLayout.tsx` — adicionar `border-b border-border/60` à classe condicional do `demorais`.

### Impacto
- **UX (`demorais`)**: agora sim igual à referência Astrea — faixa superior contínua (logo+topbar mesmo fundo, sem divisor vertical entre eles), separada do restante por **uma linha horizontal única** que atravessa toda a largura.
- **Outros tenants**: zero mudança.
- **Dados/RLS**: nenhuma.
- **Riscos**: nenhum — apenas reposiciona uma borda já existente.

### Validação
1. `/demorais/dashboard`: linha horizontal sutil aparece logo abaixo do logo, alinhada e contínua com a borda inferior do topbar.
2. Conferir que **não há** linha vertical separando o bloco do logo do início do topbar (fundo contínuo lateral).
3. Tema claro e escuro: borda sutil mas visível.
4. Outros tenants (`/solvenza/...`): visual glass anterior intacto.
5. Sidebar recolhido: linha continua alinhada.

