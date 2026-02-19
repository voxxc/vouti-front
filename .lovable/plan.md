

## Aumentar calendario da Agenda em ~40%

### Mudanca

Aumentar a largura fixa do calendario de `480px/540px` para `670px/750px` (~40% maior), fazendo os cards de prazos ocuparem menos espaco horizontal.

### Detalhe tecnico

**Arquivo**: `src/components/Agenda/AgendaContent.tsx` (linha 818)

```
// ANTES
<div className="lg:w-[480px] xl:w-[540px] shrink-0">

// DEPOIS
<div className="lg:w-[670px] xl:w-[750px] shrink-0">
```

Isso redistribui o espaco: o calendario fica com ~60-65% da largura e a listagem de prazos com ~35-40%, tornando os cards mais compactos.

