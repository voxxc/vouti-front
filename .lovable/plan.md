

## Adicionar imagem do computador na hero section

A imagem do computador com o dashboard sera colocada ao lado direito do texto principal da hero section, exatamente onde o X vermelho indica na segunda imagem.

### O que muda

**1. Salvar a imagem** do computador como `src/assets/hero-computer.png`

**2. Reestruturar a hero section** em `src/pages/HomePage.tsx`
- Transformar o layout atual (texto ocupando toda a largura) em um grid de duas colunas no desktop
- Coluna esquerda: texto, subtitulo e botoes (conteudo atual)
- Coluna direita: imagem do computador, grande e bem posicionada
- No mobile, a imagem aparecera abaixo do texto

### Detalhes tecnicos

- Layout: `grid grid-cols-1 lg:grid-cols-2` com alinhamento vertical centralizado
- Imagem: tamanho generoso, com classes como `w-full max-w-2xl` para ficar grande e impactante
- A imagem tera um leve deslocamento para a direita (`lg:-mr-12`) para dar mais presenca visual, saindo levemente do container
- O `max-w-4xl` atual do texto sera removido/ajustado para caber na coluna esquerda
- Responsividade: no mobile a imagem aparece abaixo do texto em tamanho adequado

