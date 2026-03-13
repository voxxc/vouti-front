

# Aba "Conclusão" nos detalhes de prazo concluído

## O que será feito

Adicionar uma aba "Conclusão" no menu underline (mesmo estilo do OriginTabs) dentro dos detalhes do prazo, visível **apenas quando o prazo está concluído**. A aba exibirá o comentário de conclusão, quem concluiu e quando.

## Alterações

### 1. `src/types/agenda.ts` — Adicionar campos ao tipo `Deadline`

Adicionar:
- `comentarioConclusao?: string`
- `concluidoEm?: Date`
- `completedByName?: string`
- `completedByAvatar?: string`

### 2. `src/hooks/useAgendaData.ts` — Mapear campos de conclusão

O `SELECT *` já traz `comentario_conclusao`, `concluido_em` e `concluido_por` do banco. Mapear esses campos para o tipo `Deadline`. Buscar o perfil de quem concluiu (`concluido_por`) junto com o criador.

### 3. `src/components/Agenda/DeadlineDetailDialog.tsx` — Mapear e exibir

- No `fetchDeadline`, mapear `comentario_conclusao`, `concluido_em` e buscar o perfil de `concluido_por` (nome + avatar).
- Trocar as abas principais de `TabsList grid-cols-2` para `grid-cols-3` quando o prazo estiver concluído.
- Adicionar `TabsTrigger value="conclusao"` com label "Conclusão" (só quando `deadline.completed`).
- Adicionar `TabsContent value="conclusao"` exibindo:
  - Comentário de conclusão
  - Quem concluiu (avatar + nome)
  - Data/hora da conclusão

### 4. `src/components/Agenda/AgendaContent.tsx` — Mesma lógica

Aplicar a mesma aba "Conclusão" no dialog inline do AgendaContent (linhas 1468-1627), com grid-cols dinâmico e conteúdo idêntico. Os dados de conclusão precisam ser buscados do banco quando o dialog abre (já que `useAgendaData` será atualizado para incluí-los).

### Arquivos
- `src/types/agenda.ts`
- `src/hooks/useAgendaData.ts`
- `src/components/Agenda/DeadlineDetailDialog.tsx`
- `src/components/Agenda/AgendaContent.tsx`

