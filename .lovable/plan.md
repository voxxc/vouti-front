

## Carrossel de Feedbacks ao lado de "Transforme seu escritório"

### O que muda

A seção "Transforme seu escritório" (linhas 476-489) será expandida de um bloco de texto simples para um layout em duas colunas:

- **Coluna esquerda**: O título "Transforme seu escritório." (já existente)
- **Coluna direita**: Um carrossel automático e vertical de cards de feedback/depoimentos de escritórios, com visual minimalista

### Cards de feedback

Cada card terá:
- Nome do advogado/escritório (fictício)
- Cidade/estado
- Texto curto de depoimento (1-2 frases)
- Aspas decorativas sutis

Estilo minimalista: fundo branco, borda cinza fina, tipografia limpa, sem cores fortes. Cards empilhados com leve sobreposição/offset para efeito de "flutuação".

### Carrossel

- Rotação automática a cada 4 segundos com transição suave (fade + slide vertical)
- Mostra 2-3 cards visíveis ao mesmo tempo com opacidade decrescente
- Sem botões de navegação (auto-play contínuo, loop infinito)
- Animação CSS pura (translateY + opacity) para manter o padrão minimalista

### Detalhes técnicos

**Arquivo:** `src/pages/HomePage.tsx`

1. **Linha 477-488**: Reestruturar a seção para grid de 2 colunas (`lg:grid-cols-2`)
2. Coluna esquerda: manter o h2 existente, adicionar subtítulo "Veja o que nossos clientes dizem"
3. Coluna direita: novo componente de carrossel inline com `useState` + `useEffect`/`setInterval` para rotação automática
4. Array de ~5 depoimentos fictícios com nome, escritório, cidade e texto
5. Renderizar 3 cards empilhados com classes de opacidade (`opacity-100`, `opacity-60`, `opacity-30`) e `translate-y` escalonado
6. Transição via `transition-all duration-700 ease-out`
7. Usar `useScrollAnimation` existente para fade-in ao scroll

**Nenhum arquivo novo** - tudo inline na seção existente para manter simplicidade.

