

## Comentarios na aba Resumo do Workspace (Vouti e Vouti.CRM)

### O que sera feito

Adicionar a secao de comentarios (com mencoes, respostas, edicao e exclusao) na aba **Resumo** do `ProjectProtocoloContent.tsx` -- o componente que renderiza os detalhes de um Processo no Workspace.

### Implementacao

**Arquivo:** `src/components/Project/ProjectProtocoloContent.tsx`

1. Importar o componente `TaskComentarios` (ja existente e funcional)
2. Na aba `TabsContent value="resumo"`, logo **antes** do bloco "Alterar Status" (linha 408), adicionar:
   - Um `<Separator />` visual
   - O componente `<TaskComentarios taskId={protocolo.id} currentUserId={currentUserId} />`
3. Adicionar a prop `currentUserId` na interface `ProjectProtocoloContentProps` (obtida do usuario logado)
4. No componente pai que renderiza `ProjectProtocoloContent`, passar o `currentUserId`

O componente `TaskComentarios` ja suporta:
- Mencionar participantes do projeto com @nome
- Responder a comentarios existentes
- Excluir comentarios proprios
- Realtime via Supabase channel

A tabela `task_comentarios` usa `task_id TEXT`, entao aceita tanto IDs de tasks quanto de protocolos sem necessidade de migracao adicional.

### Arquivos editados

| Arquivo | Acao |
|---|---|
| `ProjectProtocoloContent.tsx` | Adicionar `TaskComentarios` na aba Resumo + prop `currentUserId` |
| Componente pai (onde renderiza `ProjectProtocoloContent`) | Passar `currentUserId` |

Nenhuma migracao SQL necessaria -- reutiliza a tabela `task_comentarios` existente.
