

## Botoes flutuantes + fundo minimalista na hero section

### 1. Botoes flutuantes ao redor do computador

Adicionar badges/botoes flutuantes posicionados ao redor da imagem do computador com icones relevantes e animacao sutil de flutuacao (float). Cada badge tera:

- Icone + texto curto
- Fundo branco com sombra suave
- Bordas arredondadas
- Animacao CSS de "float" (sobe e desce levemente, cada um com delay diferente)

**Badges planejados:**
- **Prazos** (icone Clock) - posicionado superior esquerdo do PC
- **Justica** (icone Scale) - posicionado inferior esquerdo
- **WhatsApp** (icone MessageCircle) - posicionado superior direito
- **Financeiro** (icone DollarSign) - posicionado inferior direito
- **Clientes** (icone Users) - posicionado centro esquerdo

### 2. Fundo minimalista com padrao de linhas e simbolos

Adicionar um fundo sutil na hero section com um padrao SVG repetido contendo:
- Grid de linhas finas em tom cinza claro
- Pequenos simbolos espaçados (circulos, cruzes, pontos) em opacidade baixa
- Efeito de gradiente radial no centro para suavizar

Implementacao via CSS `background-image` com SVG inline no estilo, ou um `::before` pseudo-element com pattern.

### Detalhes tecnicos

**Arquivo editado:** `src/pages/HomePage.tsx`

- Importar icones adicionais do lucide-react: `Clock, Scale, MessageCircle, DollarSign, Users`
- Envolver a imagem do computador em um `div relative` e posicionar os badges com `absolute`
- Adicionar keyframes de animacao `float` no `src/index.css`
- Adicionar fundo com padrao SVG na section hero usando `style={{ backgroundImage: ... }}` com um SVG pattern minimalista de linhas e simbolos juridicos espaçados
- O padrao tera opacidade muito baixa (~5-8%) para manter o visual limpo

**Arquivo editado:** `src/index.css`
- Adicionar `@keyframes float` com variantes de delay para cada badge

