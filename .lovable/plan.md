

## Replicar Visual da Homepage com Screenshots Reais

### O que sera feito

Atualizar a secao "Tudo que seu escritorio precisa." da homepage para replicar o layout da imagem de referencia (4a imagem): lista de features na esquerda com screenshots empilhados/sobrepostos na direita, criando um visual de profundidade com as telas do sistema real.

### Mudancas

#### 1. Copiar as 3 screenshots para o projeto

As 3 imagens enviadas (WhatsApp CRM, Kanban de Projetos, Processos) serao copiadas para `src/assets/` como:
- `showcase-whatsapp-crm.png` (imagem 1 - tela do CRM WhatsApp)
- `showcase-kanban.png` (imagem 2 - Kanban de projetos com colunas)
- `showcase-processos-list.png` (imagem 3 - lista de processos)

#### 2. Atualizar a secao "Tudo que seu escritorio precisa."

Transformar o layout atual (lista full-width) em um grid de 2 colunas:
- **Esquerda**: dois botoes "Ver Modulos" no topo, titulo "Tudo que seu escritorio precisa." em italico bold, e a lista de features em duas colunas com bullets vermelhos (como ja esta)
- **Direita**: stack de 3 screenshots sobrepostos com leve rotacao/perspectiva e sombra, empilhados como na referencia (imagem atras parcialmente visivel, imagem do meio, imagem da frente em destaque)

O visual da referencia mostra:
- Screenshots com bordas arredondadas e sombra suave
- Empilhamento com offset (cada tela ligeiramente deslocada)
- Fundo limpo branco mantido

#### 3. Detalhes do layout

O grid sera `lg:grid-cols-2` com:
- Coluna esquerda: botoes + titulo + features grid 2 colunas
- Coluna direita: container relativo com 3 imagens posicionadas absolutamente, com transforms de rotacao e escala para criar o efeito de stack 3D

CSS para o stack:
- Imagem de tras: `rotate(-3deg) translate(-10px, 10px)` com opacity menor
- Imagem do meio: `rotate(0deg)` posicionada centralizada  
- Imagem da frente: `rotate(2deg) translate(10px, -10px)` em destaque

### Detalhes tecnicos

**Arquivos a criar/copiar:**
- `src/assets/showcase-whatsapp-crm.png` (copia de image-116.png)
- `src/assets/showcase-kanban.png` (copia de image-117.png)
- `src/assets/showcase-processos-list.png` (copia de image-118.png)

**Arquivo a editar:**
- `src/pages/HomePage.tsx` - secao "Features Grid" (linhas ~399-419) sera reescrita para incluir o grid com imagens empilhadas na direita, replicando o visual da referencia

**Imports a adicionar:**
```typescript
import showcaseWhatsapp from '@/assets/showcase-whatsapp-crm.png';
import showcaseKanban from '@/assets/showcase-kanban.png';
import showcaseProcessosList from '@/assets/showcase-processos-list.png';
```

**Estrutura do stack de imagens:**
```text
[Container relativo com aspect-ratio]
  - img 1 (fundo): absolute, rotate(-4deg), shadow-md, z-10
  - img 2 (meio): absolute, rotate(0deg), shadow-lg, z-20, offset esquerda
  - img 3 (frente): absolute, rotate(3deg), shadow-xl, z-30, offset direita
```

A secao mantera os mesmos botoes "Ver Modulos" e a lista de features existente, apenas adicionando a coluna de imagens ao lado.

