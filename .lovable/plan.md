
## Correção: Prazo salvo um dia antes

### Causa
No `CreateDeadlineDialog.tsx` (linha 97), a data é convertida assim:
```
date: date.toISOString().split('T')[0]
```
O `toISOString()` converte para UTC. No fuso do Brasil (UTC-3), meia-noite local vira 21h do dia anterior em UTC — resultando no dia anterior sendo salvo.

A `AgendaContent.tsx` já usa `format(date, 'yyyy-MM-dd')` corretamente (linha 566), sem conversão UTC.

### Correção
**`src/components/Project/CreateDeadlineDialog.tsx` (linha 97)**
- Trocar `date.toISOString().split('T')[0]` por `format(date, 'yyyy-MM-dd')` usando o `format` do `date-fns` (já importado no arquivo).

Apenas uma linha precisa mudar.
