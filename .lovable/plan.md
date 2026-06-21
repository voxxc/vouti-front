## Causa raiz

Os andamentos do caso `0000118-44.2025.8.16.0174` estão **invertidos** na controladoria do tenant — não faltam, mas aparecem na ordem oposta da do super-admin, fazendo parecer que "as informações estão erradas".

Verifiquei via SQL:
- Existem **114 andamentos** em `processos_oab_andamentos` para esse processo, todos com `tenant_id` correto. Nenhum é escondido por RLS.
- **Todos os 114 já têm `super_admin_ordem` preenchido** (não há nulls).
- A edge function `super-admin-reordenar-andamentos` grava `ordem = total - idx` — o **topo da lista (mais recente) recebe o maior número** (114) e o rodapé recebe 1.
- O super-admin lê `ORDER BY super_admin_ordem DESC` → mostra 114, 113, 112… (recente → antigo). Correto.
- O tenant lê `ORDER BY super_admin_ordem ASC` (em `useAndamentosOAB.fetchAndamentos` e em `sortAndamentos` no `useOABs.ts`) → mostra 1, 2, 3… (antigo → recente).

Resultado: no super-admin o usuário vê primeiro "Sentença / Decisão recente"; na controladoria vê primeiro "JUNTADA DE PETIÇÃO INICIAL" de janeiro/2025. Para conferir, basta rolar até o fim da lista do tenant — os 114 estão lá, só em ordem invertida.

## Correção

Alinhar a ordenação do tenant à do super-admin: **DESC por `super_admin_ordem`** (com `nullsFirst:false` para itens novos sem ordem ficarem ao final), depois `data_movimentacao DESC` como tiebreaker.

1. **`src/hooks/useOABs.ts`**
   - Em `useAndamentosOAB.fetchAndamentos`: trocar `.order('super_admin_ordem', { ascending: true, nullsFirst: false })` por `.order('super_admin_ordem', { ascending: false, nullsFirst: false })`.
   - Em `sortAndamentos`: inverter a comparação de `super_admin_ordem` para `(bo - ao)` (maior primeiro), mantendo o desempate por `data_movimentacao` desc e mantendo itens com ordem antes dos sem ordem.

Nenhuma outra mudança é necessária — o componente `ProcessoOABDetalhes` apenas renderiza `andamentos` na ordem que o hook devolve.

## Arquivos afetados

- `src/hooks/useOABs.ts` (2 pequenas mudanças: query do `fetchAndamentos` e função `sortAndamentos`)

Sem migrations, sem RLS, sem edge functions.

## Impacto

1. **Usuário final (UX, telas, fluxos):** na controladoria, ao abrir qualquer processo OAB (via Central, aba OAB, drawer, etc.), os andamentos passam a aparecer **do mais recente para o mais antigo**, batendo exatamente com o que o super-admin vê e com o padrão "novidade no topo" usado nos outros painéis. O contador de não-lidos, badges e funcionalidades continuam intactos.
2. **Dados:** zero. Nenhuma mudança em tabela, RLS, índice ou edge function. É só ordenação client-side e na cláusula `.order()` do Supabase.
3. **Riscos colaterais:** mínimos. Real-time `INSERT` continua chamando `sortAndamentos` (agora DESC), então andamento novo entra no topo — comportamento esperado e melhor que o atual (entrava no meio/fim quando o super-admin já tinha reordenado tudo). Se algum tenant havia "se acostumado" com a ordem invertida atual, vai notar a mudança — mas a ordem nova é objetivamente a correta (recente primeiro).
4. **Quem é afetado:** todos os usuários de **todos os tenants** que abrem detalhes de processos OAB na controladoria (admin, controller, advogado, estagiário etc.). Super-admin não muda.

## Validação

- Reabrir o processo `0000118-44.2025.8.16.0174` na Central da controladoria → primeiro card deve ser o de junho/2026 (último movimento) e o último card deve ser "JUNTADA DE PETIÇÃO INICIAL" de 08/01/2025.
- Confirmar que o total exibido continua **114 andamento(s)** (rótulo já existente no header).
- Comparar lado-a-lado com o painel super-admin: a sequência dos cards deve ser idêntica.
- Reordenar manualmente no super-admin (cadeado), salvar, recarregar a controladoria → a nova ordem deve refletir imediatamente para o tenant.
- Disparar uma sincronização Judit/Escavador para gerar um andamento novo → ele aparece no **topo** da lista do tenant (via realtime) e do super-admin.
