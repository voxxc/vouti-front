

## Corrigir o hero: gerar nova imagem e ajustar a linha divisoria

### Problema atual
1. A imagem do computador tem fundo transparente com padrao quadriculado (checkered) visivel, que destoa completamente do design clean da pagina.
2. A linha divisoria esta muito colada nos botoes - precisa de mais espaco.

### Solucao

#### 1. Gerar nova imagem via AI
Usar a edge function com o modelo de geracao de imagem para criar um mockup de computador/monitor moderno exibindo um dashboard juridico, com fundo branco solido (sem transparencia), que combine com a estetica minimalista da pagina.

- **Prompt**: Um monitor/iMac moderno e elegante exibindo um dashboard de gestao juridica com graficos, tabelas e metricas. Fundo branco solido, estilo flat/minimal, sombra suave. Cores predominantes: branco, cinza claro, com detalhes em vermelho (#E11D48).
- A imagem gerada sera salva em `src/assets/hero-computer.png` substituindo a atual.

#### 2. Ajustar posicionamento da linha divisoria
- Adicionar mais padding inferior (`pb-20 sm:pb-28`) na secao hero para que a linha fique bem mais abaixo dos botoes.
- Ajustar o overlap negativo do computador (`mb-[-120px] lg:mb-[-160px]`) para manter o efeito 3D sobre a linha.
- Aumentar o spacer correspondente (`h-[120px] lg:h-[160px]`).

### Detalhes tecnicos

**Arquivos modificados:**
- `src/assets/hero-computer.png` - substituido pela imagem gerada
- `src/pages/HomePage.tsx` - ajuste de padding e margens na secao hero

