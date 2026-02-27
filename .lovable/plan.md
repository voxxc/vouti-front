

## Replicar Logo Solvenza baseada na imagem de referência

### O que muda
Atualizar `src/components/LogoSolvenza.tsx` para replicar o visual da imagem:

1. **Cores**: Trocar gradiente dourado por azul escuro (`#1B3A5C`) e laranja/coral (`#D4724A`)
2. **Escudo**: Manter formato pentagonal mas com preenchimento parcial — metade azul, metade laranja, com a letra S estilizada em azul escuro sobreposta
3. **Letra S**: Estilizada com curvas mais elegantes, em azul escuro, com um detalhe decorativo laranja/coral ao redor
4. **Texto "GRUPO"**: Mudar cor para azul escuro (`#1B3A5C`), manter posição acima de SOLVENZA
5. **Texto "SOLVENZA"**: Mudar cor para azul escuro (`#1B3A5C`), manter tracking e peso bold

### Detalhes técnicos
- Redesenhar o SVG do escudo com paths que representem o formato da imagem (escudo com cantos mais arredondados, elementos decorativos laranja e azul)
- Usar dois gradientes: um azul e um laranja
- A letra S terá um path SVG customizado em vez de `<text>` para replicar o estilo caligráfico da imagem
- Manter a mesma interface (props `size` e `className`) sem alterar nenhum outro componente

### Arquivo afetado
- `src/components/LogoSolvenza.tsx` — reescrever o SVG e as cores

