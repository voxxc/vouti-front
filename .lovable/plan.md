# Checkbox de seleção do Geral mais minimalista

## Causa raiz
Os checkboxes da tabela (coluna de seleção + header) usam o `Checkbox` padrão do shadcn, que renderiza um círculo/quadrado com borda azul forte (`border-primary`), ficando muito chamativo em cada linha — especialmente quando há muitos processos listados.

## Correção
Aplicar um estilo discreto apenas aos checkboxes da tabela do Geral, sem mexer no componente global:

- Borda fina e cinza (`border-muted-foreground/30`) no estado padrão.
- Hover sutil (`hover:border-muted-foreground/60`).
- Estado marcado em tom neutro (`data-[state=checked]:bg-foreground/80 data-[state=checked]:border-foreground/80`) em vez de azul vivo.
- Tamanho ligeiramente menor (`h-3.5 w-3.5`) e cantos `rounded-[3px]` para parecer mais delicado.
- Header da coluna com `w-8` (em vez de `w-10`) para reduzir o espaço reservado.

Aplicado via `className` nos dois `<Checkbox>` (header + linha) em `GeralTab.tsx`.

## Arquivos afetados
- `src/components/Controladoria/GeralTab.tsx` — checkboxes nas linhas ~376-380 (header) e ~401-405 (linha) + largura da coluna ~375.

## Impacto
1. **Usuário final (UX):** a coluna de seleção fica visualmente discreta — bolinhas/quadradinhos pequenos em cinza claro. Quando marcados, viram um tom escuro neutro em vez do azul forte. Comportamento idêntico (clicar seleciona, ações em lote continuam funcionando).
2. **Dados:** nenhum. Sem migrations, RLS ou queries novas.
3. **Riscos colaterais:** nenhum — apenas classes Tailwind locais. Não afeta outros checkboxes do app (CRM, Agenda, etc.).
4. **Quem é afetado:** apenas usuários que abrem a aba Geral em Controladoria/Solvenza.

## Validação
- Abrir `/solvenza/dashboard` → aba Geral → confirmar que os checkboxes ficaram pequenos e cinza.
- Marcar 1 e marcar "todos" no header → confirmar que a barra de "X processo(s) selecionado(s)" aparece e exclusão em lote funciona normal.
