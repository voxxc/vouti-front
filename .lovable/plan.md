

## Corrigir badges cortados no modo PC

### Problema

O container dos badges (linha 324) tem `overflow-hidden` aplicado em todos os tamanhos de tela. Isso foi adicionado para evitar scroll horizontal no mobile, mas no desktop esta cortando badges que usam posicoes negativas como `-left-10`, `-right-6`, `-top-8`.

### Solucao

Trocar `overflow-hidden` por `overflow-hidden lg:overflow-visible` no container (linha 324). Assim:

- **Mobile**: mantem `overflow-hidden` para evitar scroll horizontal
- **Desktop (lg+)**: usa `overflow-visible` para que os badges aparecam completos fora dos limites do container

### Detalhes tecnicos

**Arquivo:** `src/pages/HomePage.tsx`

**Linha 324**: Alterar de:
```
<div className="relative lg:-mr-12 overflow-hidden">
```
Para:
```
<div className="relative lg:-mr-12 overflow-hidden lg:overflow-visible">
```

Apenas 1 linha alterada. Nenhum outro arquivo afetado.

