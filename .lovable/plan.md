## Contexto
No modal de confirmação de ativação/desativação de monitoramento (`ProcessoOABDetalhes.tsx`), o texto atual menciona:
- "monitoramento visual" para apartados
- "Escavador" em ambos os casos (apartado e normal)

O usuário quer uma confirmação simples, sem citar o provedor nem qualificar o monitoramento como "visual".

## Alteração
Atualizar as strings no `AlertDialogDescription` (linhas ~996-1003 de `ProcessoOABDetalhes.tsx`):

- **Ativar (apartado)**: remover "apenas visual" e "Escavador". Ex: "Deseja ativar o monitoramento deste processo apartado?"
- **Desativar (apartado)**: remover "visual" e "Escavador". Ex: "Deseja desativar o monitoramento deste processo?"
- **Ativar (normal)**: manter confirmação, sem citar "Escavador". Ex: "Deseja ativar o monitoramento? Você receberá notificações automáticas de novos andamentos."
- **Desativar (normal)**: manter confirmação atual (já não cita Escavador).

## Impacto
- **UX**: mensagem de confirmação mais limpa e direta.
- **Dados**: nenhuma migration ou mudança de schema.
- **Riscos**: nenhum — apenas alteração de strings de UI.
- **Afetados**: todos os usuários que ativam/desativam monitoramento de processos OAB.

## Validação
- Abrir o drawer de um processo apartado, clicar no toggle de monitoramento e verificar que o modal não menciona "visual" nem "Escavador".
- Repetir para um processo normal (não apartado, não sigiloso).