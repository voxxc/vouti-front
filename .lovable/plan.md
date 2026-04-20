

## Corrigir scrollbar branca nas colunas do Planejador

### Causa raiz
No `PlanejadorKanban.tsx` (linha 164), o container interno das tarefas usa apenas `overflow-y-auto h-full` — sem nenhuma estilização de scrollbar. Resultado: aparece o scrollbar nativo do browser, com aparência clara/branca, contrastando feio com o tema escuro (visível na imagem enviada).

Já existe em `src/index.css` (linhas 320-337) a classe utilitária `.planejador-scroll` — fina (6px), thumb sutil em `muted-foreground/0.2`, track transparente — mas ela **não está sendo aplicada** no kanban.

### Correção
**`src/components/Planejador/PlanejadorKanban.tsx`** — linha 164:
- Trocar `className="space-y-2 overflow-y-auto h-full"` por `className="space-y-2 overflow-y-auto h-full planejador-scroll"`.

Verificar também o scroll horizontal externo (linha 143, `overflowX: 'auto'`) — aplicar a mesma classe se também aparecer barra branca quando há muitas colunas.

### Arquivos afetados
- `src/components/Planejador/PlanejadorKanban.tsx` (1 linha alterada, possivelmente 2)

### Impacto
- **UX**: scrollbar das colunas do Planejador fica fina, discreta e harmoniza com o tema (claro/escuro). Track transparente — sem mais "barra branca".
- **Dados**: zero.
- **Riscos colaterais**: nenhum. A classe já existe e está testada.
- **Quem é afetado**: todos os usuários do Planejador (`/:tenant/planejador` e drawer).

### Validação
1. Abrir Planejador → aba "Colunas".
2. Coluna com muitas tarefas mostra scrollbar fina, cinza translúcida — sem fundo branco.
3. Modo claro e escuro: scrollbar permanece sutil em ambos.

