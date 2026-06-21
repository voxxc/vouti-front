## Objetivo
Impedir que o usuário dispare duas vezes o salvamento de um movimento manual ao clicar rapidamente no botão "Salvar movimento", evitando registros duplicados.

## Causa raiz
O componente `AdicionarMovimentoManualDialog` já possui estado `salvando` e prop `disabled={salvando}`, mas a função `handleSalvar` não possui guarda inicial contra chamadas concorrentes. Em um duplo clique muito rápido, o segundo disparo pode ocorrer antes que o React atualize o estado de `salvando` ou antes que o Edge Function retorne.

## Correção
1. Adicionar retorno antecipado no início de `handleSalvar` caso `salvando` já seja `true`.
2. Manter o botão desabilitado durante o salvamento (já existe, mas reforçar a consistência).
3. Manter o fluxo atual de: sucesso → `reset()` → `onSuccess()` → `onOpenChange(false)` → `setSalvando(false)` no `finally`.

## Arquivos afetados
- `src/components/SuperAdmin/AdicionarMovimentoManualDialog.tsx`

## Impacto
1. **UX**: o botão "Salvar movimento" fica bloqueado após o primeiro clique e um spinner já é exibido; o guarda adicional elimina a janela de concorrência do duplo clique.
2. **Dados**: reduz a chance de inserir o mesmo andamento/manual duas vezes na tabela de movimentações.
3. **Riscos colaterais**: mínimo — apenas evita re-submissão legítima caso a função demore; se houver erro, o botão é reabilitado normalmente pelo `finally`.
4. **Quem é afetado**: usuários do Super Admin que lançam movimentos manuais em processos OAB.

## Validação
1. Abrir o diálogo de movimento manual em um processo.
2. Preencher os campos e clicar rapidamente duas vezes em "Salvar movimento".
3. Verificar no console de rede que apenas uma requisição é enviada ao Edge Function `super-admin-criar-andamento-manual`.
4. Confirmar que o diálogo fecha e apenas um registro é criado.