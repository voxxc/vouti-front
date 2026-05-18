# Filtro do Geral mais minimalista

## Causa raiz
O filtro atual usa um `Select` com largura fixa `w-56`, ícone `Filter` à esquerda e `Badge` de contagem ao lado. Visualmente pesado e chamativo no topo da aba Geral.

## Correção
Substituir o `Select` por um trigger discreto inspirado no estilo do filtro de etiquetas do WhatsApp (`ConversationList.tsx`):

- Botão `ghost` compacto exibindo apenas o rótulo atual (ex: "Todos", "SP", "Com novos andamentos") + chevron pequeno.
- Sem ícone `Filter` externo; sem `Badge` de contagem ao lado (a contagem já aparece dentro do próprio rótulo).
- Quando um filtro diferente de "Todos" estiver ativo: trigger com leve destaque (`text-primary`, fundo `primary/5`) + um `x` minúsculo para limpar.
- Manter o mesmo `SelectContent` com as opções (UFs, OABs, monitorados, não lidos) — só muda a aparência do trigger.

Resultado: linha do filtro vira um chip discreto alinhado à esquerda, sem caixa branca grande.

## Arquivos afetados
- `src/components/Controladoria/GeralTab.tsx` — bloco do filtro (linhas ~275-319).

## Impacto
1. **Usuário final (UX):** topo da aba Geral fica mais limpo; filtro vira um chip pequeno em vez de uma caixa de seleção larga. Comportamento idêntico — mesmas opções, mesmo clique para abrir.
2. **Dados:** nenhum. Sem migrations, sem RLS, sem novas queries.
3. **Riscos colaterais:** nenhum — alteração puramente visual no trigger do `Select`.
4. **Quem é afetado:** apenas usuários que abrem a aba Geral em Controladoria/Solvenza.

## Validação
- Abrir `/solvenza/dashboard` → aba Geral → confirmar que o filtro aparece como chip discreto.
- Selecionar uma UF / OAB / "Com novos andamentos" → confirmar que filtra normalmente e o chip muda de estilo (ativo) com botão `x` para limpar.
