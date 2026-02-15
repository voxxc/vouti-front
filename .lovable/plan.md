
## Fundo com simbolos juridicos + novos badges flutuantes

### 1. Fundo com padrao de simbolos juridicos

Substituir o padrao SVG atual (grid simples com pontos) por um novo padrao SVG repetitivo com simbolos juridicos desenhados em linhas finas:
- Balanca da justica
- Martelo de juiz
- Livro de leis aberto
- Pena de escrever
- Coluna grega

Caracteristicas:
- Tons neutros (cinza claro ~#d4d0c8 / bege ~#e8e4dd) sobre fundo off-white
- Opacidade entre 10-20% para efeito watermark
- Pattern maior (~120x120px) para os simbolos ficarem espacados
- Manter o gradiente radial que suaviza as bordas

### 2. Alterar badges existentes

- **"Justica"** vira **"Processos"** (manter icone Scale ou trocar para FileText)

### 3. Adicionar 3 novos badges flutuantes

- **CRM** (icone UserCheck ou Contact) - posicionado no meio-direito
- **IA** (icone Sparkles ou Brain) - posicionado superior-centro
- **Dashboard** (icone LayoutDashboard) - posicionado inferior-centro

Cada badge segue o mesmo estilo visual (branco/blur, sombra, borda, icone colorido) e usa uma das animacoes de float existentes.

### Detalhes tecnicos

**Arquivo:** `src/pages/HomePage.tsx`
- Importar novos icones: `FileText, Sparkles, LayoutDashboard, UserCheck`
- Linha 341-343: trocar "Justica" por "Processos" e icone Scale por FileText
- Adicionar 3 novos blocos de badge (CRM, IA, Dashboard) dentro do container `relative`
- Linhas 281-283: substituir o SVG pattern por um novo com simbolos juridicos detalhados em opacidade 10-15%
