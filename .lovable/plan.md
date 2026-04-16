

## Plano: Menu de 3 pontos para apagar mensagem no chat + lixeira com dupla confirmação para excluir tarefa

### 1. Menu de 3 pontos nas mensagens do chat (`PlanejadorTaskChat.tsx`)

- Ao lado de cada mensagem (onde já existe o botão de Reply), adicionar um ícone `MoreVertical` (3 pontinhos) que aparece no hover do grupo
- Ao clicar, abre um dropdown (`DropdownMenu`) com a opção "Apagar mensagem" (com ícone de lixeira)
- Só aparece para mensagens do próprio usuário (`msg.user_id === user?.id`)
- Criar mutation `deleteMessage` que faz `DELETE` na tabela `planejador_task_messages` pelo `id` da mensagem
- Após deletar, invalidar a query `planejador-messages`

### 2. Botão de excluir tarefa com lixeira + dupla confirmação (`PlanejadorTaskDetail.tsx`)

- Trocar o botão "Excluir" (texto) por um botão com ícone `Trash2` (lixeira)
- Em vez de executar `onDelete` diretamente, abrir um `AlertDialog` de dupla confirmação
- O dialog pergunta "Tem certeza que deseja excluir esta tarefa?" com botões "Cancelar" e "Excluir" (destructive)

### Arquivos alterados
- `src/components/Planejador/PlanejadorTaskChat.tsx` — menu de 3 pontos + delete mutation
- `src/components/Planejador/PlanejadorTaskDetail.tsx` — lixeira + AlertDialog

