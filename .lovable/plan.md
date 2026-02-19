

## Corrigir barra de scroll na Agenda

### Problema

O componente `ScrollArea` do Radix UI requer uma altura explicita (`h-[...]`) no elemento raiz para funcionar. Usar apenas `max-h-[312px]` na classe nao propaga a restricao de altura para o viewport interno, entao o scroll nunca ativa.

### Solucao

Substituir os 4 usos de `<ScrollArea className="max-h-[312px]">` por um `<div>` nativo com `overflow-y-auto max-h-[312px]`. Isso e mais simples e funciona imediatamente sem depender da mecanica interna do Radix.

### Detalhes tecnicos

**Arquivo**: `src/components/Agenda/AgendaContent.tsx`

Nas 4 ocorrencias (linhas ~839, ~861, ~920, ~934), trocar:

```tsx
// ANTES
<ScrollArea className="max-h-[312px]">
  <div className="space-y-2 pr-2">
    ...
  </div>
</ScrollArea>

// DEPOIS
<div className="max-h-[312px] overflow-y-auto space-y-2 pr-2">
  ...
</div>
```

Remover o import de `ScrollArea` se nao for mais utilizado no arquivo.

| Arquivo | Mudanca |
|---|---|
| `src/components/Agenda/AgendaContent.tsx` | Substituir 4x `ScrollArea` por `div` com `overflow-y-auto` |
