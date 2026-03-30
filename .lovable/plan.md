

## Plano: Corrigir filtro de prazos no Planejador

### Problema

Em `PlanejadorPrazosView.tsx` (linha 38), o filtro inclui `d.createdByUserId === userId`, fazendo com que prazos **criados por** Daniel apareçam na visão dele, mesmo quando o prazo foi atribuído a Wesley como responsável.

### Correção

Remover a condição `d.createdByUserId === userId` do filtro em `PlanejadorPrazosView.tsx`. O prazo só deve aparecer para o usuário se ele for:
1. O **advogado responsável** (`advogadoResponsavel.userId`)
2. Um **usuário marcado/tagged** (`taggedUsers`)

**Arquivo**: `src/components/Planejador/PlanejadorPrazosView.tsx` (linha 38)

Antes:
```ts
if (d.createdByUserId === userId) return true;
```

Depois: remover esta linha.

### Impacto
- Prazos criados por Daniel para Wesley não aparecerão mais no Planejador de Daniel
- Se Daniel for responsável OU marcado no prazo, ele continuará vendo normalmente

