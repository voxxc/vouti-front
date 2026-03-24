

# Fix: Conclusão de prazo no Protocolo sem comentário e sem dados completos

## Problema
No fluxo Projeto > Protocolo > Prazos, ao clicar "Info" e depois "Marcar como Concluído", o sistema:
1. **Não pede comentário de conclusão** - apenas faz `update({ completed: true })` sem `comentario_conclusao`, `concluido_por`, `concluido_em`
2. O prazo fica "meio concluído" - marcado como `completed=true` mas sem os campos de auditoria, causando inconsistência com a Central de Prazos Concluídos

## Solução
Substituir o `AlertDialog` simples de confirmação no `ProjectProtocoloContent.tsx` por um dialog com campo de comentário obrigatório + opção de subtarefa, igual ao padrão da Agenda.

## Alterações

### `src/components/Project/ProjectProtocoloContent.tsx`

1. **Adicionar estados** para `comentarioConclusao`, `criarSubtarefa`, `subtarefaDescricao`

2. **Refatorar `toggleDeadlineCompletion`** (linhas 230-247):
   - Quando for **concluir** (`currentStatus === false`): gravar `completed: true`, `comentario_conclusao`, `concluido_por: user.id`, `concluido_em: now()` -- igual à Agenda
   - Quando for **reabrir** (`currentStatus === true`): manter o comportamento atual de toggle

3. **Substituir o `AlertDialog`** (linhas 816-834) por um `Dialog` com:
   - `Textarea` para comentário obrigatório
   - Checkbox opcional "Criar subtarefa" com campo de descrição
   - Botão "Concluir" desabilitado se comentário vazio

4. **Criar subtarefa** se marcada, inserindo em `deadline_subtarefas` (mesmo padrão da Agenda)

| Arquivo | Mudança |
|---------|---------|
| `src/components/Project/ProjectProtocoloContent.tsx` | Dialog de conclusão com comentário obrigatório + campos de auditoria completos |

