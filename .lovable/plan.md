

## Diferenciais "Por que Vouti.CRM" — carrossel vertical estilo roleta no mobile

### Correção

Na seção **"Por que Vouti.CRM"** de `src/pages/CrmSalesLanding.tsx` (linhas 363–396), trocar o grid mobile (`grid-cols-1`) por um **carrossel vertical interativo** que funciona como uma roleta — só 1 card visível por vez, deslizando para cima/baixo aparece o próximo/anterior; os demais somem (entram por baixo ou por cima conforme a direção).

**Comportamento mobile (`< md`):**
- Container com altura fixa (~180px) e `overflow-hidden`.
- Apenas 1 card visível ao centro, ocupando toda a largura.
- Cards "fantasma" anterior/próximo ficam parcialmente visíveis nas bordas superior/inferior (~20% de opacidade) para dar pista visual de que dá para deslizar.
- Indicadores laterais (bolinhas verticais à direita) mostram a posição atual (1 de 8).
- Botões discretos ↑ ↓ no canto direito para quem prefere clicar.

**Interação:**
- **Swipe vertical** (touch): arrastar para cima → próximo card; arrastar para baixo → anterior. Threshold de ~40px.
- **Scroll wheel** (quando o cursor está sobre o carrossel, opcional — só mobile não tem mouse, então focar em touch).
- **Botões ↑/↓**: navegação manual.
- **Auto-loop**: ao chegar no último, volta ao primeiro (e vice-versa).

**Animação:**
- Card atual: `translateY(0) opacity-100 scale-100`.
- Card que sai (para cima): `translateY(-100%) opacity-0`.
- Card que entra (vindo de baixo): `translateY(100%) opacity-0` → `translateY(0) opacity-100`.
- Transição: `transition-all duration-400 ease-out`.
- Direção dinâmica: se o usuário deslizou para cima, o próximo entra de baixo; se deslizou para baixo, o anterior entra de cima.

**Desktop (`md+`)**: mantém o grid `sm:grid-cols-2 lg:grid-cols-4` atual sem mudança alguma.

### Implementação técnica

1. Estados locais no componente:
   - `const [activeIdx, setActiveIdx] = useState(0)`
   - `const [direction, setDirection] = useState<'up' | 'down'>('up')`
   - Refs para `touchStartY` e `touchEndY`.

2. Handlers:
   - `onTouchStart` → grava `touchStartY`.
   - `onTouchEnd` → calcula delta; se `> 40px` chama `next()`/`prev()` ajustando `direction`.
   - `next()`: `setDirection('up'); setActiveIdx(i => (i + 1) % items.length)`.
   - `prev()`: `setDirection('down'); setActiveIdx(i => (i - 1 + items.length) % items.length)`.

3. Render mobile (dentro de `md:hidden`):
   ```text
   <div className="relative h-[180px] overflow-hidden touch-pan-x">
     {items.map((d, i) => {
       const offset = i - activeIdx;
       // offset 0 = ativo, -1 = acima, 1 = abaixo, outros = fora
       ...
     })}
     <verticalDots />
     <upDownButtons />
   </div>
   ```

4. Render desktop (mantém `hidden md:grid ...`).

### Arquivos afetados

**Modificados:**
- `src/pages/CrmSalesLanding.tsx` — refatorar a seção "Diferenciais" (linhas 363–396): extrair lista de itens para const reutilizável; adicionar bloco mobile com carrossel vertical e bloco desktop com grid existente.

**Sem mudanças:** nenhum outro componente, hook, rota, banco, edge function.

### Impacto

**Usuário final (UX):**
- Mobile: seção "Por que Vouti.CRM" deixa de ocupar 8 cards empilhados (~700px de altura) e passa a ser uma única "janela" de ~200px com navegação tátil — drasticamente menos scroll.
- Interação tipo "roleta" (swipe vertical) cria momento de engajamento e destaca cada diferencial individualmente em vez de virar uma lista monótona.
- Indicadores e botões garantem descobribilidade — usuário entende imediatamente que dá para navegar.

**Dados:** nenhum impacto — apenas UI.

**Riscos colaterais:**
- Usuário pode não notar imediatamente que há mais cards → mitigado por: bolinhas indicadoras (8 dots), botões ↑↓ visíveis, e sombras/fade dos cards adjacentes.
- Touch handlers não interferem com scroll vertical da página: o carrossel só captura swipe quando o delta vertical é claro (>40px) e dentro do container; abaixo desse threshold deixa o scroll passar.
- Desktop continua exatamente igual — sem regressão.

**Quem é afetado:** visitantes mobile da landing `/crm`.

### Validação

1. Mobile (390x844): seção "Por que Vouti.CRM" mostra 1 card centralizado de cada vez, com bolinhas à direita indicando 1 de 8.
2. Swipe para cima → card atual sobe e some, próximo entra de baixo. Bolinha avança.
3. Swipe para baixo → inverte. Bolinha retrocede.
4. Clicar nos botões ↑/↓ → mesma navegação.
5. Após o card 8, swipe para cima volta ao card 1 (loop).
6. Scroll vertical normal da página continua funcionando fora do carrossel.
7. Desktop (1440px) → grid 4 colunas idêntico ao atual, sem carrossel.
8. Tema claro/escuro mantidos.

