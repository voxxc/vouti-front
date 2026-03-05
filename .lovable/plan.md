

## Plano: Motivo da troca de responsável no prazo

### Objetivo
Quando o usuário trocar o responsável ao editar um prazo, exibir um campo de texto para informar o motivo. Ao salvar, registrar um comentário automático detalhado com nomes antigo/novo e o motivo.

### Alterações em `src/components/Agenda/EditarPrazoDialog.tsx`

**1. Novo state para motivo**
- `motivoTroca` (string) — texto do motivo
- `originalAdvogadoId` (string | null) — guarda o ID original ao abrir o dialog
- Detectar troca: `advogadoId !== originalAdvogadoId`

**2. Campo condicional no formulário**
- Após o `AdvogadoSelector`, se `advogadoId !== originalAdvogadoId && originalAdvogadoId !== null`, renderizar um `Textarea` com label "Motivo da alteração" e placeholder "Informe o motivo da troca de responsável..."
- Animação suave com `overflow-hidden` + `max-height` transition

**3. Comentário automático detalhado no `handleSave`**
- Quando o responsável mudar, buscar os nomes (antigo e novo) via query a `profiles`
- Buscar também o nome de quem está fazendo a alteração (user atual)
- Gerar comentário separado e rico:
  ```
  🔄 Responsável do prazo alterado
  Alterado por: [nome do editor]
  De: [nome antigo] → Para: [nome novo]
  Motivo: [texto digitado]
  ```
- Este comentário é inserido via `deadline_comentarios` (mesmo mecanismo já existente)
- Remover a linha genérica `Responsável alterado` do array `changes` para evitar duplicidade

### Arquivos a editar
| Arquivo | Mudança |
|---------|---------|
| `EditarPrazoDialog.tsx` | States, campo condicional, lógica de comentário com nomes |

Nenhuma alteração de banco necessária — usa a tabela `deadline_comentarios` e `profiles` já existentes.

