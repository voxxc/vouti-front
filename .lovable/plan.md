# Polir animação de arrastar tokens/carteiras

Tornar o drag-and-drop dos tokens (e carteiras) mais fluido e elegante, em vez do "salto" atual com borda dura.

## O que muda visualmente

- **Item arrastado**: em vez de só `opacity-40`, ganha leve `scale-[0.98]`, `shadow-lg`, `ring-1 ring-primary/30`, `rotate-[0.3deg]` e cursor `grabbing`. Transição suave (`transition-all duration-200 ease-out`).
- **Indicador de drop**: substituir a borda superior dura (`border-t-2 border-primary`) por uma **linha-guia animada** — uma faixa fina (`h-0.5`) com `bg-primary` e `shadow-[0_0_8px_hsl(var(--primary)/0.6)]` que aparece com `animate-fade-in` acima do item-alvo, mostrando exatamente onde o token vai cair.
- **Itens vizinhos**: aplicam `transition-transform duration-200` para deslizarem suavemente quando o alvo muda (efeito "abrir espaço").
- **Modo reordenar ativo**: `GripVertical` ganha `opacity-60 hover:opacity-100`, e o card inteiro recebe `bg-muted/20` sutil para sinalizar que está em modo edição.
- **Hover no handle**: micro-scale (`hover:scale-110`) no `GripVertical` com `transition-transform`.
- **Carteiras**: mesma linguagem — item arrastado encolhe levemente + sombra; linha-guia entre carteiras em vez de borda.

## Arquivos afetados

- `src/components/Dashboard/TOTP/TokenRow.tsx` — refinar classes do estado `isDragging`/`isDragOver`, adicionar linha-guia.
- `src/components/Dashboard/TOTP/WalletCard.tsx` — mesma linguagem para carteiras + tokens internos.
- (Opcional) `tailwind.config.ts` — adicionar keyframe `drop-indicator` (pulse sutil) se necessário.

## Impacto

1. **UX**: arrastar fica fluido, com feedback claro de onde o item vai cair; some o "salto" feio. Modo reordenar fica visualmente distinto do modo normal.
2. **Dados**: nenhuma mudança — só CSS/classes Tailwind.
3. **Riscos colaterais**: nenhum (mudança puramente visual, não toca lógica de DnD nem mutações de `sort_order`).
4. **Quem é afetado**: todos os usuários que abrem o painel 2FA e ativam o cadeado.

## Validação

- Ativar cadeado, arrastar token: item encolhe + sombra, linha-guia aparece sobre o alvo, vizinhos deslizam suavemente.
- Soltar: animação termina suave, ordem persiste.
- Mesmo comportamento ao reordenar carteiras.
- Sair do modo reordenar: visual volta ao normal sem flicker.
