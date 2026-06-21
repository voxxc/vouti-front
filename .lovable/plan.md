## Objetivo
Permitir lançar múltiplos movimentos manuais de uma vez no diálogo "Adicionar movimento manual", organizados em abas independentes dentro do mesmo diálogo.

## Causa raiz
Hoje `AdicionarMovimentoManualDialog` salva apenas um movimento por abertura. Para registrar vários andamentos de um mesmo processo, o usuário precisa reabrir o diálogo várias vezes.

## Correção

### 1. UI do diálogo com abas
- Substituir o formulário único por uma estrutura com lista de abas + painel de conteúdo da aba selecionada.
- Lista vertical/horizontal de abas no topo do `DialogContent`, com:
  - Botão "+ Nova aba" que cria uma nova aba e a posiciona **no topo da lista** (índice 0), tornando-a a aba ativa.
  - Cada aba mostra um rótulo dinâmico: nome do movimento (`tipo`) ou data, e um `X` para remover.
  - Remoção pede confirmação (via `confirm` simples) se a aba tiver `tipo` ou `descricao` preenchidos. Não permite remover a última aba (sempre deve haver pelo menos uma).
- Ao abrir, o diálogo já cria 1 aba vazia com a data de hoje.

### 2. Estado por aba
Cada aba é um objeto:
```ts
{ id: string, data: string, tipo: string, descricao: string,
  marcarNaoLido: boolean, marcarComoAtualizado: boolean, arquivo: File | null }
```
- `data` default = hoje.
- `marcarNaoLido` default = `true`.
- `marcarComoAtualizado` default = **`false`** (conforme pedido: não vem mais sempre marcado).
- Os campos do formulário leem/escrevem na aba ativa.

### 3. Salvamento
- Botão único "Salvar movimentos" (texto plural).
- Validação por aba antes de enviar: tipo obrigatório, descrição mínima de 10 caracteres. Se alguma aba falhar a validação, abrir essa aba e mostrar toast com índice/nome.
- Ordem de envio: **da última aba (mais antiga, no fim da lista) para a primeira (mais nova, no topo)** — isso garante que o histórico fique cronológico no banco e que a aba "mais nova" seja a última criada.
- Loop sequencial chamando o Edge Function `super-admin-criar-andamento-manual` (sem mudanças na função).
- Loader no botão durante o envio; guarda contra duplo clique já existe.
- Em caso de erro em uma das chamadas: parar o loop, manter abas já salvas removidas, manter abas restantes no diálogo, mostrar toast com qual aba falhou.
- Sucesso total: `reset()`, `onSuccess()`, `onOpenChange(false)`, toast "N movimentos lançados".

### 4. Layout das abas
- Faixa horizontal rolável no topo (`overflow-x-auto`), com chips:
  - aba ativa em destaque (`bg-primary/10 border-primary`)
  - hover com `bg-muted`
  - botão `X` aparece em hover
- Botão "+ Nova aba" fica como o primeiro item à esquerda da faixa.
- Conteúdo do formulário renderiza apenas a aba ativa (todos os campos atuais permanecem).

## Arquivos afetados
- `src/components/SuperAdmin/AdicionarMovimentoManualDialog.tsx` (refatoração ampla para multi-aba)

Sem alterações em backend, banco ou Edge Function.

## Impacto
1. **UX**: o Super Admin lança vários movimentos do mesmo processo em uma única sessão do diálogo. A nova aba aparece sempre no topo, espelhando a ordem do resumo (mais novo em cima). A checkbox "marcar como atualizado por 7 dias" deixa de vir pré-marcada — só ativa se o usuário quiser.
2. **Dados**: continuam sendo criados N registros independentes em `processos_oab_andamentos` (um por aba), via a mesma Edge Function. Nenhuma mudança de schema, RLS ou storage.
3. **Riscos colaterais**:
   - Se a rede falhar no meio do salvamento sequencial, parte dos movimentos pode ter sido criada e parte não — mitigado fechando apenas as abas já salvas e mostrando o erro.
   - Mudança de default do "marcar como atualizado" altera o comportamento atual (era pré-marcado). Aceito pelo usuário.
4. **Quem é afetado**: apenas o Super Admin que usa o drawer "Movimentos manuais". Tenants e advogados não veem mudança de fluxo, só recebem os andamentos lançados.

## Validação
1. Abrir o drawer Super Admin → selecionar processo → "Adicionar movimento manual".
2. Verificar que abre com 1 aba vazia, data de hoje, "marcar como atualizado" **desmarcado**.
3. Preencher tipo/descrição → clicar "+ Nova aba" → confirmar que a nova aba aparece **no topo** e fica ativa.
4. Preencher a segunda aba; alternar entre abas e ver que cada uma mantém seus próprios dados/anexo/checkboxes.
5. Remover uma aba com conteúdo: confirmar que pede confirmação; remover uma aba vazia: remove direto. Tentar remover a última: bloqueada.
6. Clicar "Salvar movimentos": confirmar 2 chamadas ao Edge Function (mais antiga primeiro), toast de sucesso, diálogo fecha, drawer recarrega e os 2 movimentos aparecem no resumo na ordem correta.
7. Forçar erro de validação em uma aba (descrição curta) e ver se o diálogo abre nessa aba com toast.