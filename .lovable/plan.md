

## Causa raiz

O usuário está em `/solvenza/dashboard` e reclama do visual "feio" das barras com fundo branco — provavelmente o componente `ClienteValoresCard.tsx` (Faixas de Valor de Contrato) que tem barras de progresso. Preciso confirmar quais barras estão na tela atual.

Pela rota `/solvenza/dashboard` e pelo screenshot mental do que mostrei (`ClienteValoresCard`), as barras são:
- `<div className="h-2 w-full rounded-full bg-muted overflow-hidden">` → fundo claro (no light theme aparece quase branco)
- `<div className="h-full rounded-full bg-primary/80">` → barra preenchida

O "fundo branco" que incomoda é o `bg-muted` do trilho da barra. Visual pesado, sem necessidade.

Deixa eu confirmar lendo o dashboard pra ver se tem outros cards com barras similares.

## Plano

Vou primeiro inspecionar o dashboard atual pra mapear **todos** os cards com barras visuais (não só o `ClienteValoresCard`), pra propor um padrão minimalista consistente — não adianta arrumar um e deixar outros feios.

**Componentes a inspecionar:**
- `src/pages/Dashboard.tsx` (ou similar) — pra ver quais cards renderizam
- `ClienteValoresCard.tsx` — barras horizontais com `bg-muted`
- Outros cards do dashboard que usem `<Progress>` ou divs com barras

### Correção proposta (minimalista)

**Antes** (pesado):
```
trilho: h-2 bg-muted rounded-full (fundo cinza claro/branco visível)
barra: bg-primary/80 (preenchimento sólido)
```

**Depois** (minimalista):
- Reduzir altura do trilho: `h-2` → `h-1` (linha fina, discreta)
- Trilho mais sutil: `bg-muted` → `bg-muted/40` (quase invisível, só dica visual)
- Barra preenchida mais leve: `bg-primary/80` → `bg-primary/70` mantendo cor
- Remover `rounded-full` no trilho se ficar melhor visualmente com cantos retos finos
- Espaçamento entre items: `space-y-3` → `space-y-2.5` pra compactar

Resultado: barra parece mais com uma "linha de progresso" do que um "elemento UI volumoso" — segue tendência minimalista (Linear, Notion, Vercel).

### Aplicar o mesmo padrão nos outros cards do dashboard

Se houver outros cards com `<Progress>` do shadcn ou divs similares, padronizar todos pra mesma altura/opacidade.

## Arquivos afetados (preliminar — confirmo no plano final)

- `src/components/Dashboard/ClienteValoresCard.tsx` — barras de faixas de valor
- Possivelmente outros cards do dashboard Solvenza com barras (a confirmar após inspeção)

## Impacto

- **Usuário final (UX)**:
  - Visual do dashboard fica **mais limpo e minimalista**, com barras finas que não competem por atenção com os números/labels.
  - Informação continua clara (largura proporcional ainda comunica o ranking), só sem peso visual.
  - Fundo branco/cinza chamativo do trilho some — sensação de "card mais leve".
- **Dados**: zero mudanças. Puramente CSS/Tailwind.
- **Performance**: nenhum impacto.
- **Riscos colaterais**:
  - **Muito baixo**. Só estilo. Se barra ficar fina demais em telas pequenas, ajusto pra `h-1.5`.
  - Se outros lugares do app usarem o mesmo padrão de barra (fora do dashboard), eles ficam **inalterados** — só mexo nos cards do dashboard que o usuário tá vendo.
- **Quem é afetado**:
  - **Todos os usuários** do Solvenza no dashboard.
  - Outros tenants do sistema também (já que o componente é compartilhado), mas pra melhor — visual mais profissional.

## Validação

1. Abrir `/solvenza/dashboard` → card "Faixas de Valor de Contrato" → barras devem aparecer finas e discretas, sem fundo branco chamativo.
2. Verificar em dark mode → barras devem manter contraste adequado.
3. Testar com dados extremos (1 cliente vs 100 clientes) → proporções continuam visíveis.
4. Verificar outros cards do dashboard se foram identificados na inspeção.

**Próximo passo após aprovação**: vou ler o `Dashboard.tsx` do Solvenza pra confirmar quais cards têm barras antes de aplicar — assim o padrão fica consistente.

