

## Plano: Adicionar aba "Conclusão" no detalhe de prazo do Protocolo

### Problema
O dialog de detalhe de prazo em `ProjectProtocoloContent.tsx` não tem a aba "Conclusão" que existe no `DeadlineDetailDialog` da Agenda. Quando um prazo é concluído com comentário, essa informação não aparece.

### Correções

**Arquivo**: `src/components/Project/ProjectProtocoloContent.tsx`

1. **Query de dados** (linha 188): Adicionar campos faltantes no `select`:
   - `comentario_conclusao, concluido_por, concluido_em, deadline_number, processo_oab_id`

2. **Tabs do dialog** (linha 828-831): Adicionar aba "Conclusão" condicional quando `selectedDeadline.completed === true`, mudando de `grid-cols-2` para `grid-cols-3`

3. **TabsContent "conclusao"** (após linha 939): Adicionar conteúdo com:
   - Comentário de conclusão (ou mensagem "Nenhum comentário")
   - Nome de quem concluiu (buscar profile pelo `concluido_por`)
   - Data de conclusão formatada

4. **Reabrir prazo** (linha 919): Trocar o botão direto por um flow com motivo obrigatório (consistente com a Agenda), usando AlertDialog com campo de texto

### Resultado
Paridade total com o `DeadlineDetailDialog` da Agenda: aba "Conclusão" visível para prazos concluídos, mostrando comentário, autor e data.

