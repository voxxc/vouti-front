

## Corrigir scrollbar horizontal do Planejador

### Causa raiz
A regra `.planejador-scroll::-webkit-scrollbar { width: 6px }` só estiliza scrollbars **verticais**. Scrollbars **horizontais** precisam de `height`. Sem essa propriedade, o Chromium ignora a estilização e renderiza a barra nativa do SO (branca grossa no Windows — exatamente o que aparece na sua imagem).

### Correção
Em `src/index.css`, atualizar a regra para incluir `height`:

```css
.planejador-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;  /* adicionar */
}
```

Uma única linha. Track transparente e thumb sutil já estão definidos e passarão a valer também na horizontal.

### Arquivos afetados
- `src/index.css` (1 linha adicionada)

### Impacto
- **UX**: barra horizontal do Kanban do Planejador fica fina e discreta como a vertical, sem fundo branco. Funciona em modo claro e escuro.
- **Dados**: zero.
- **Riscos colaterais**: nenhum — `.planejador-scroll` só é usado nos containers do Kanban do Planejador.
- **Quem é afetado**: usuários do Planejador (página e drawer), em browsers WebKit/Chromium (Chrome, Edge, Brave). Firefox já usava `scrollbar-width: thin` para ambos os eixos.

### Validação
1. Abrir Planejador com colunas suficientes para forçar scroll horizontal.
2. Barra inferior aparece fina e translúcida — sem fundo branco.
3. Conferir nas barras verticais das colunas — devem permanecer iguais.

