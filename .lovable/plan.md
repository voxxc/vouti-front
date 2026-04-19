

## Corrigir filtro do painel "Minhas Tarefas e Prazos"

### Causa raiz

No componente `PrazosAbertosPanel.tsx` (linha 85), a query da aba **Prazos** usa:

```ts
.or(`user_id.eq.${userId},advogado_responsavel_id.eq.${userId},id.in.(${taggedIds})`)
```

Isso traz prazos onde o usuário é apenas **criador** (`user_id`), mesmo sem ser responsável (`advogado_responsavel_id`) nem estar tagueado (`deadline_tags`). Resultado: aparecem prazos "destinados a outros" só porque o usuário logado os criou.

Verificação nas demais abas:
- **Tarefas Administrativas** (`task_tarefas`) e **Tarefas Jurídicas** (`processos_oab_tarefas`): essas tabelas têm **apenas** o campo `user_id` (= criador). Não existe coluna de "responsável" separada. Atualmente filtram por `user_id = userId`, ou seja, mostram só o que o próprio usuário criou. **Está coerente** — mas o usuário pode considerar "minhas tarefas" como "tarefas em que sou taggeado/responsável". Como não há esse campo no schema dessas tabelas hoje, mantenho como está e sinalizo no impacto.

### Correção

**Arquivo: `src/components/Dashboard/PrazosAbertosPanel.tsx` (linha 85)**

Trocar:
```ts
.or(`user_id.eq.${userId},advogado_responsavel_id.eq.${userId}${taggedIds.length > 0 ? `,id.in.(${taggedIds.join(',')})` : ''}`)
```

Por (remove `user_id.eq.${userId}`):
```ts
const orFilter = `advogado_responsavel_id.eq.${userId}${taggedIds.length > 0 ? `,id.in.(${taggedIds.join(',')})` : ''}`;
// ...
.or(orFilter)
```

Edge case: se o usuário não for responsável de nada **e** não estiver tagueado em nada, `taggedIds = []` e o filtro vira só `advogado_responsavel_id.eq.${userId}` — comportamento correto (lista vazia se não tiver nada).

### Arquivos afetados

- `src/components/Dashboard/PrazosAbertosPanel.tsx` (1 linha)

### Impacto

- **UX**: 
  - Aba "Prazos" do painel passa a mostrar **só** prazos onde o usuário é o **advogado responsável** OU está **tagueado** — alinhado com a expectativa de "meus prazos".
  - Prazos criados pelo usuário mas atribuídos a outra pessoa **deixam de aparecer** no painel pessoal (continuam visíveis na Agenda completa).
  - Usuários que costumavam ver "todos os prazos que criaram" vão notar uma lista menor — esse é o comportamento desejado.
- **Dados**: zero migration. Apenas filtro de leitura.
- **Performance**: marginalmente melhor (filtro mais restritivo).
- **Riscos colaterais**: 
  - Se houver prazos legados criados sem `advogado_responsavel_id` definido e sem tags, o criador deixa de vê-los aqui — precisará abrir Agenda. **Mitigação**: aceitável; o painel é "minhas tarefas e prazos", não "tudo que criei".
  - Tarefas Admin e Jurídicas continuam mostrando o que o usuário criou (limitação do schema atual). Se o usuário quiser que essas também sejam filtradas por "responsável/tagueado", precisaria de uma migration adicionando essas colunas — fora do escopo desta correção.
- **Quem é afetado**: todos os usuários do sistema jurídico em `/:tenant/dashboard` (admin e demais roles, pois o `PrazosAbertosPanel` é usado em `AdminMetrics` e `AdvogadoMetrics`).

### Validação

1. `/solvenza/dashboard` → aba "Prazos": só aparecem prazos onde sou responsável OU estou tagueado.
2. Criar um prazo atribuindo a outro advogado → **não** deve aparecer no meu painel.
3. Criar um prazo atribuindo a mim mesmo → aparece.
4. Ser tagueado em prazo de terceiro → aparece.
5. Abas "Tarefas Admin" e "Tarefas Jurídicas": comportamento mantido (mostram tarefas criadas pelo usuário).

