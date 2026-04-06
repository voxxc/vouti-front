

## Plano: Padronizar ações dos diálogos de detalhes de prazos

### Problema identificado

Existem 3 layouts diferentes para as ações no rodapé dos diálogos de detalhes:

- **Dashboard (DeadlineDetailDialog)** — layout correto: botão "Marcar como Concluído" + menu 3 pontos (Editar / Excluir)
- **Agenda (inline dialog)** — layout despadronizado: botão Concluído + botão Editar separado + botão Excluir vermelho avulso
- **Protocolo (ProjectProtocoloContent)** — mudanças recentes já adicionaram o 3-pontos no header, mas falta garantir que o rodapé siga o mesmo padrão

### Solução

Padronizar o rodapé de ações do dialog inline da **Agenda** (`AgendaContent.tsx`) para usar o mesmo layout do `DeadlineDetailDialog`:

**Arquivo**: `src/components/Agenda/AgendaContent.tsx` (linhas ~1671-1730)

Substituir os botões avulsos (Concluído + Edit + Trash) por:
- Botão "Marcar como Concluído" (ou "Marcar como Pendente") ocupando `flex-1`
- Menu 3 pontos (`MoreVertical`) com:
  - "Editar" → abre `EditarPrazoDialog`
  - "Excluir prazo" → abre AlertDialog de confirmação

Isso replica exatamente o padrão do `DeadlineDetailDialog` (2a screenshot), removendo o botão vermelho de excluir e o botão separado de editar.

### Arquivo a editar
- `src/components/Agenda/AgendaContent.tsx` — seção de ações do dialog inline (linhas 1671-1730)

