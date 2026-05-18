# Ajuste mobile — botões "Avisos" e "Criar Novo Cliente"

## Causa raiz
No `SystemTypeSection`, o cabeçalho usa `flex flex-row items-center justify-between` com os dois botões (`Avisos` e `Criar Novo Cliente`) na linha do título. Em 390px:
- O título "Gestão Jurídica" + descrição compete por espaço.
- Os labels "Avisos" e "Criar Novo Cliente" empurram o layout, podendo cortar texto ou estourar largura.
- Os botões viram alvos pequenos e mal posicionados.

## Correção

### Mobile (`<sm`)
- Header empilha: ícone+título numa linha; descrição em segunda linha; botões numa **terceira linha** que ocupa largura total.
- Os dois botões ficam lado a lado em **grid 2 colunas** com `flex-1`, altura `h-10`, ícone + label compacto.
- "Criar Novo Cliente" vira "Novo cliente" no mobile (label menor).

### Desktop (`sm+`)
- Mantém o layout atual: título à esquerda, botões à direita.

```text
Mobile (<sm)
┌──────────────────────────────────┐
│ [icon] Gestão Jurídica            │
│        Descrição curta...         │
│ ┌──────────────┬───────────────┐  │
│ │ 🔔 Avisos    │ ＋ Novo cliente│  │
│ └──────────────┴───────────────┘  │
└──────────────────────────────────┘

Desktop (sm+)  — inalterado
[icon] Gestão Jurídica           [🔔 Avisos] [＋ Criar Novo Cliente]
```

## Arquivos afetados
- `src/components/SuperAdmin/SystemTypeSection.tsx` — só ajuste de classes Tailwind e label condicional via classes responsivas (`hidden sm:inline`).

## Impacto
1. **UX mobile**: cabeçalho legível, botões com toque confortável (h-10), sem overflow horizontal.
2. **Dados**: zero alteração — apenas reorganização visual.
3. **Riscos colaterais**: nenhum — desktop fica idêntico.
4. **Quem é afetado**: apenas o super-admin acessando `/super-admin` no celular.

## Validação
- Em 390px: cabeçalho empilhado, sem rolagem horizontal, botões em duas colunas iguais.
- Em ≥ 640px: layout original preservado (botões à direita, labels completos).
