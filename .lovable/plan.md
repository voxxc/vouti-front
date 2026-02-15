

## Substituir imagem do showcase "Processos"

Tarefa simples: copiar a imagem enviada para `src/assets/showcase-processos.png` (substituindo o `.jpg` atual) e atualizar o import no `HomePage.tsx`.

### Detalhes Tecnicos

| Arquivo | Mudanca |
|---|---|
| `src/assets/showcase-processos.png` | Copiar a imagem enviada (`user-uploads://image-109.png`) |
| `src/assets/showcase-processos.jpg` | Pode ser removido (substituido pelo .png) |
| `src/pages/HomePage.tsx` | Linha 10: Mudar import de `showcase-processos.jpg` para `showcase-processos.png` |

**Alteracao no import (linha 10):**
```
// De:
import showcaseProcessos from '@/assets/showcase-processos.jpg';
// Para:
import showcaseProcessos from '@/assets/showcase-processos.png';
```

Nenhuma outra mudanca necessaria - o restante do codigo ja referencia a variavel `showcaseProcessos`.

