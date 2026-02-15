

## Adicionar logo no header do site

A imagem enviada sera salva como asset do projeto e usada no header da HomePage, substituindo o texto atual "Vouti." pelo logo em imagem.

### Mudancas

**1. Copiar a imagem** para `src/assets/logo-vouti-header.png`

**2. Editar `src/pages/HomePage.tsx`**
- Importar a imagem: `import logoVoutiHeader from '@/assets/logo-vouti-header.png'`
- Substituir o `<span>` com texto "Vouti." (linhas 236-238) por uma tag `<img>` usando o asset importado
- A imagem tera altura fixa (~36px) para caber bem no header, com `h-9` e largura automatica

