

## Adicionar exclusão em massa de processos — Controladoria → Geral

### Causa raiz
A aba `Geral` (`GeralTab.tsx`) hoje só permite excluir processos **um por vez** clicando no ícone de lixeira em cada linha. Para escritórios com centenas de processos órfãos/duplicados, isso é inviável — falta um modo de seleção múltipla com ação em lote.

### Correção

**1. Modo de seleção com checkboxes na tabela**
- Nova coluna de **checkbox à esquerda** em cada linha de `<TableRow>`.
- **Checkbox "selecionar todos"** no `<TableHead>` — marca/desmarca todos os processos **filtrados/visíveis** na página atual.
- Estado local `selectedIds: Set<string>` mantido em `GeralTab.tsx`.
- Clique no checkbox usa `e.stopPropagation()` para **não abrir o drawer** de detalhes do processo.

**2. Barra de ação em lote (aparece quando ≥1 selecionado)**
- Faixa fixa acima da tabela (ou colada ao topo do `Card`) mostrando:
  - `"X processo(s) selecionado(s)"`
  - Botão **"Limpar seleção"**
  - Botão **"Excluir selecionados"** (destrutivo, vermelho, com ícone `Trash2`)
- Some quando seleção está vazia.

**3. Diálogo de confirmação em lote**
- Reutiliza o componente `AlertDialog` já existente, mas em modo "lote":
  - Título: `"Excluir N processos"`
  - Descrição lista os primeiros 5 CNJs + `"e mais X..."` se houver mais.
  - Aviso explícito: **processos com monitoramento ativo serão pulados** (não bloqueia o lote inteiro).
- Ação: itera sobre os IDs chamando `excluirProcesso` em paralelo controlado (Promise.all em chunks de 5 pra não estourar conexões/rate-limit), agregando `sucessos`/`pulados`/`erros`.
- Toast final consolidado: `"X excluídos, Y pulados (monitorados), Z falharam"`.

**4. Reset de seleção**
- Limpa `selectedIds` após:
  - Conclusão da exclusão em lote.
  - Mudança de filtro UF/OAB.
  - Mudança de página.
  - Nova busca.

### Arquivos afetados

- **`src/components/Controladoria/GeralTab.tsx`** (único arquivo editado):
  - Importar `Checkbox` de `@/components/ui/checkbox`.
  - Adicionar estado `selectedIds`, handlers `toggleOne`, `toggleAll`, `handleBulkDelete`.
  - Adicionar coluna de checkbox no header e em cada `<TableRow>`.
  - Adicionar barra de ação em lote.
  - Estender `AlertDialog` para suportar modo "single" e "bulk" (ou usar dois dialogs separados — escolher conforme legibilidade na hora).
- **Hook `useAllProcessosOAB`**: **sem alterações** — `excluirProcesso(id, cnj)` já existe, retorna `boolean` e respeita a regra de monitoramento ativo (bloqueia silenciosamente os monitorados, o que mapeia direto pra "pulados").
- **Backend / RLS / migration**: **nada**. A política DELETE em `processos_oab` já existe (a exclusão individual funciona hoje).

### Impacto

- **Usuário final (UX)**: aba Geral ganha checkbox em cada linha + "selecionar todos". Ao marcar processos, aparece barra com contador e botão "Excluir selecionados". Confirmação mostra lista parcial dos CNJs. Após confirmar, exclusão acontece em lote, com feedback consolidado. Quem só usa exclusão individual continua tendo o ícone de lixeira por linha — nenhum fluxo antigo quebra.
- **Dados**: zero migração. Cada exclusão respeita as mesmas regras (monitorados são pulados, andamentos são apagados em cascata pelo hook). Nenhuma exclusão escapa do filtro de tenant porque RLS aplica em cada `DELETE` individual.
- **Performance/risco**: chunk de 5 deletes paralelos evita sobrecarregar o Supabase. Para lotes muito grandes (>50), exibir progresso ("Excluindo 12/47...") no botão.
- **Riscos colaterais**:
  - Usuário pode marcar acidentalmente "todos" e excluir muita coisa → mitigado pelo `AlertDialog` mostrando contagem e CNJs.
  - "Selecionar todos" só marca a **página atual** (não todos os 1000+ processos do tenant) — comportamento explícito para evitar exclusão em massa não intencional. Se desejado depois, dá pra adicionar opção "Selecionar todos os X processos do filtro" como segundo nível.
- **Quem é afetado**: somente usuários com permissão DELETE em `processos_oab` (admin/controller/advogado dono do registro, conforme RLS atual). Nenhum outro tenant impactado.

### Validação

1. Abrir Controladoria → aba **Geral** → conferir que apareceu coluna de checkbox.
2. Marcar 1 processo → barra de ação aparece com "1 processo selecionado" + botão "Excluir selecionados".
3. Clicar checkbox do header → todos da página atual ficam marcados; contador atualiza.
4. Clicar "Excluir selecionados" → diálogo lista CNJs e total → confirmar.
5. Toast mostra `"X excluídos"`. Tabela atualiza, seleção limpa.
6. Repetir incluindo 1 processo **monitorado** no lote → toast mostra `"X excluídos, 1 pulado (monitorado)"`. Monitorado permanece na lista.
7. Marcar processos, mudar filtro UF → seleção é resetada (sem deletar nada).
8. Recarregar página (F5) → processos excluídos não voltam.
9. Clicar no checkbox **não** abre o drawer de detalhes; clicar na linha (fora do checkbox) continua abrindo o drawer.
10. Testar com tela mobile (1210px e abaixo) → checkboxes e barra de ação não quebram layout.

