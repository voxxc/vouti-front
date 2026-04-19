

## Causa raiz

Problemas no card da aba **Prazos** (`PlanejadorPrazosView.tsx`):

1. **Nome do responsável corta** — `max-w-[80px] truncate` + apenas `.split(" ")[0]` (primeiro nome) — em colunas estreitas, mesmo o primeiro nome cortou pra "Da…", "Gilm…".
2. **Layout horizontal apertado** — data + ícone + nome forçados na **mesma linha**, sem espaço suficiente em colunas de ~260-300px.
3. **Coluna com largura rígida** (`min-w-[260px] max-w-[300px]`) — não se adapta bem a viewports menores nem maiores.
4. **Faixa "vazia" à direita do card** (visível na primeira imagem) — é o `ScrollArea` reservando espaço pra scrollbar mesmo quando não rola, criando aquela faixa morta.

## Correção

### Card de prazo (responsivo)
- **Quebrar layout em 2 linhas** quando necessário: data em uma linha, responsável em outra, em vez de forçar tudo lado a lado.
- **Remover `max-w-[80px]`** do nome — deixar `truncate` natural ocupar o espaço disponível.
- **Mostrar nome completo** (não só primeiro nome) com `truncate` — se couber, aparece tudo; se não, mostra "…" no fim de forma elegante.
- **Categoria (amber badge)** já tem espaço próprio — manter.
- Padding interno: `p-3` → `p-2.5` pra ganhar uns pixels.

### Coluna (responsiva)
- Trocar `min-w-[260px] max-w-[300px]` por `min-w-[240px]` sem max — assim em telas grandes as colunas crescem e cabe mais conteúdo.
- Em mobile (`<768px`), colunas com `min-w-[280px]` pra leitura confortável (scroll horizontal já existe).

### Scrollbar morta
- Trocar `ScrollArea` por `div` com `overflow-y-auto` + classe `scrollbar-thin` (custom) ou esconder scrollbar quando não há overflow — elimina a faixa morta à direita.

## Arquivos afetados

- `src/components/Planejador/PlanejadorPrazosView.tsx` — único arquivo.

## Impacto

- **Usuário final (UX)**:
  - Nome do responsável **não corta mais** abruptamente — ou cabe inteiro, ou trunca elegantemente com "…" usando o espaço real disponível.
  - Nome **completo** (ex: "Daniela Silva") em vez de só primeiro — mais informação útil.
  - Faixa morta à direita do card desaparece — visual mais limpo.
  - **Responsivo de verdade**: em telas grandes, colunas crescem; em mobile, mantém largura mínima legível com scroll horizontal.
- **Dados**: zero mudanças. Puramente visual/CSS.
- **Performance**: nenhum impacto (na verdade leve melhora ao remover `ScrollArea` do Radix).
- **Riscos colaterais**:
  - **Muito baixo**. Só estilo. Se em alguma resolução específica ficar estranho, ajusto fino.
  - Se algum tenant tiver nomes de responsável muito longos (ex: "Maria Aparecida da Conceição Silva"), o `truncate` natural lida.
- **Quem é afetado**:
  - **Todos os usuários** que abrem aba "Prazos" do Planejador, em qualquer tenant.

## Validação

1. Abrir `/solvenza/dashboard` → Planejador → aba **Prazos** → confirmar que cards mostram nome completo do responsável (ou trunca limpo) e sem faixa morta à direita.
2. Redimensionar janela (1920px → 1280px → 768px) — colunas devem se adaptar.
3. Testar em mobile (viewport 390px) — scroll horizontal funcional, cards legíveis.
4. Testar com prazo sem responsável e sem categoria — layout não quebra.

