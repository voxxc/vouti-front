Vou ajustar o atalho do lead nas reuniões para ele não depender apenas de `cliente_id`, porque pelo print a reunião tem nome/telefone do cliente, mas o botão ainda não aparece. O problema provável é que algumas reuniões antigas ou criadas manualmente têm `cliente_nome`/`cliente_telefone`, mas não têm `cliente_id` vinculado no registro.

Plano de correção:

1. Tornar o atalho visível no card e no modal de detalhes
- No card da reunião, exibir um botão claro como “Ver lead” sempre que houver dados de cliente (`cliente_id`, nome, telefone ou email), não apenas quando existir `cliente_id`.
- No modal de detalhes da reunião, adicionar o botão “Ver ficha do lead” na área “Informações do Cliente” mesmo quando o vínculo ainda precisar ser resolvido.
- Usar um botão mais evidente do que apenas o ícone, para ficar fácil de encontrar.

2. Resolver o lead ao clicar, mesmo em reuniões antigas
- Alterar o handler de abertura para aceitar a reunião inteira, não só `cliente_id`.
- Se a reunião já tiver `cliente_id`, abrir diretamente a ficha do lead.
- Se não tiver `cliente_id`, buscar o cliente cadastrado por telefone normalizado e/ou nome dentro do tenant.
- Se encontrar, abrir a ficha do lead.
- Se não encontrar, criar ou vincular o lead a partir dos dados da reunião, conforme o padrão já usado ao criar reuniões novas, e então abrir a ficha.

3. Garantir que o dialog receba os dados do lead
- Hoje o dialog depende da lista `clientes` já carregada. Vou ajustar para, ao clicar no atalho, garantir que a lista seja atualizada antes de abrir ou selecionar o lead correto.
- Se necessário, manter um estado do cliente selecionado diretamente para evitar abrir vazio quando o cliente foi encontrado/criado naquele momento.

4. Melhorar o vínculo futuro
- Ao resolver um lead para uma reunião sem `cliente_id`, atualizar a própria reunião com esse `cliente_id`, respeitando tenant isolation, para que o atalho continue aparecendo direto nas próximas vezes.

Arquivos previstos:
- `src/components/Reunioes/ReuniaoCard.tsx`
- `src/components/Reunioes/ReunioesContent.tsx`
- Possivelmente `src/hooks/useReunioes.ts` ou `src/hooks/useReuniaoClientes.ts` para reaproveitar/criar uma função segura de resolução do cliente.

Resultado esperado:
- No card da reunião marcada haverá um atalho visível para a ficha do lead.
- No modal do print, dentro de “Informações do Cliente”, aparecerá “Ver ficha do lead”.
- Reuniões antigas sem vínculo explícito também conseguirão abrir a ficha do lead pelo nome/telefone e passarão a ficar vinculadas.