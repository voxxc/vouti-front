

## Melhorar Visibilidade das 3 Imagens Empilhadas

### Problema

As 3 imagens estao quase sobrepostas no mesmo ponto, com offsets muito pequenos (left: 4/12/20 e top: 8/4/16). Isso faz com que apenas a imagem da frente (WhatsApp) seja visivel, escondendo as outras duas quase completamente.

### Solucao

Aumentar significativamente o offset entre as imagens e reduzir o tamanho de cada uma para que as 3 fiquem visiveis em formato "leque" / "fan spread", como na imagem de referencia. Tambem ajustar a altura do container para comportar o spread maior.

### Mudancas no arquivo `src/pages/HomePage.tsx` (linhas 440-463)

Ajustar posicionamento e tamanho das 3 imagens:

- **Imagem de tras (Processos)**: `top-0 left-0`, `w-[75%]`, `rotate(-6deg)` - mais para esquerda e cima
- **Imagem do meio (Kanban)**: `top-12 left-[15%]`, `w-[75%]`, `rotate(0deg)` - centralizada
- **Imagem da frente (WhatsApp)**: `top-24 left-[30%]`, `w-[75%]`, `rotate(5deg)` - mais para direita e baixo

Isso cria um spread tipo "leque" onde cada imagem fica deslocada o suficiente para ser claramente visivel, mostrando bordas e parte do conteudo das imagens de tras.

Tambem aumentar a altura do container de `550px` para `600px` para acomodar o spread vertical maior.

