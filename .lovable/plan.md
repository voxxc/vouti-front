## Causa raiz
O `truncate` aplicado em cada `TabsTrigger` corta o texto quando a célula fica estreita (especialmente no breakpoint `sm` com 7 colunas e no mobile com 4 colunas). Com o badge ocupando o topo, o espaço útil ainda é suficiente para o texto completo — o problema é o `truncate` forçar reticências antes do necessário.

## Correção
Trocar `truncate` por `whitespace-nowrap` no label de texto e remover do trigger, deixando o conteúdo crescer até o limite real da célula. Como os nomes "Andamentos" e "Intimações" cabem em ~75px (font 11px), não há overflow real em 1473px (cada célula tem ~200px). 

Ajustes pontuais:
- Remover `truncate` dos `TabsTrigger` e do `<span>` interno; usar `whitespace-nowrap`
- Reduzir `text-[11px]` para `text-[10px]` apenas no breakpoint mobile (`grid-cols-4`) onde o espaço é menor — usar `text-[10px] sm:text-[11px]`
- Manter `min-w-0` para o grid funcionar, mas o `whitespace-nowrap` impede quebra/corte
- Padding lateral reduzido para `px-1` no mobile e `sm:px-1.5` no desktop, garantindo espaço extra
- Badge no topo permanece igual (já implementado)

Resultado: "Andamentos" e "Intimações" aparecem por inteiro tanto em mobile quanto desktop, com badge minimalista centralizado no topo.

## Arquivos afetados
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — apenas a `TabsList` e seus 7 `TabsTrigger`

## Impacto
1. **UX**: usuário lê o nome completo das abas, melhorando navegação e clareza visual.
2. **Dados**: nenhum impacto — mudança puramente CSS.
3. **Riscos colaterais**: em viewports muito pequenos (<360px), o texto pode estourar a célula horizontalmente. Mitigado mantendo `text-[10px]` no mobile e padding mínimo.
4. **Quem é afetado**: todos os usuários que abrem o drawer de detalhes de processo em qualquer tenant.

## Validação
- Abrir um processo no viewport atual (1473px) e confirmar "Andamentos" e "Intimações" completos.
- Testar em viewport mobile (~390px) e confirmar que não há reticências nem overflow.
- Verificar que o badge no topo continua centralizado e não sobrepõe o texto.
