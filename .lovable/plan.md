

## Imagem escurecida na tela de Auth

### Causa
Linha 216: existe um overlay `<div className="absolute inset-0 bg-black/35" />` sobre a imagem de fundo, que aplica 35% de preto por cima.

### Correção
**`src/pages/Auth.tsx`** (linha 216)
- Reduzir ou remover o overlay. Como o logo agora é preto e o slogan é branco, podemos reduzir para `bg-black/15` (overlay bem sutil) ou remover completamente (`bg-black/0` ou deletar a div).
- Recomendo reduzir para `bg-black/10` para manter leve legibilidade do slogan branco sem escurecer demais a foto.

