## Causa raiz
O clique em **Salvar movimento** está chegando na UI, mas não há feedback nem chamada para `super-admin-criar-andamento-manual`. A causa provável é o fluxo de modal aninhado (`Sheet` + `Dialog`) deixando o clique/estado sem resposta visível, além da validação atual depender apenas de toast.

## Correção
1. Ajustar `AdicionarMovimentoManualDialog.tsx` para dar feedback imediato no botão assim que o usuário clica:
   - ativar `salvando` antes da validação;
   - mostrar spinner e texto `Salvando...`;
   - sempre destravar o estado no `finally` ou em falha de validação.
2. Tornar validações bloqueantes visíveis e inequívocas:
   - se faltar nome ou descrição mínima, focar a aba/campo e exibir toast;
   - garantir que o botão volte ao normal após erro.
3. Adicionar proteção contra clique perdido/estado travado:
   - evitar `salvandoRef` preso;
   - impedir duplo clique sem bloquear permanentemente.
4. Se necessário no mesmo arquivo, ajustar o `Dialog` para não herdar bloqueio de pointer-events do `Sheet` pai quando aberto sobre o painel do super-admin.

## Arquivos afetados
- `src/components/SuperAdmin/AdicionarMovimentoManualDialog.tsx`

## Impacto
1. **Usuário final / UX:** ao clicar em salvar, o botão reage imediatamente com spinner; se houver erro de preenchimento, o erro aparece e o botão volta ao normal; se estiver válido, o movimento é enviado.
2. **Dados / Supabase:** sem migration, sem mudança de RLS e sem mudança de tabelas. A edge function existente continua sendo usada.
3. **Riscos colaterais:** baixo; mudança restrita ao modal de criação manual de movimento. O principal cuidado é não deixar o botão em loading se a validação falhar.
4. **Quem é afetado:** super-admins que adicionam movimentos manuais; tenants/usuários comuns só percebem o movimento depois de salvo.

## Validação
- Abrir Super Admin > movimentos manuais > processo.
- Preencher movimento válido e clicar em **Salvar movimento**.
- Confirmar spinner imediato, chamada à função `super-admin-criar-andamento-manual`, toast de sucesso e atualização da lista.
- Testar campos inválidos para garantir que aparece erro e o botão não fica travado.