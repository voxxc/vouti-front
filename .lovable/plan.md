## Causa raiz
O botão "Cartão Credencial" foi adicionado apenas em `TenantCard.tsx`, mas a UI atual usa o layout em **linha expansível** (`TenantRow.tsx` desktop e `TenantRowMobile.tsx` mobile), que não foi atualizado. Por isso o botão não aparece na seção INTEGRAÇÕES.

## Correção
Replicar o mesmo padrão já aplicado em `TenantCard.tsx` nos dois componentes de linha:

1. **`src/components/SuperAdmin/TenantRow.tsx`**
   - Importar `IdCard` (lucide-react) e `CartaoCredencialDialog`.
   - Adicionar estado `showCartao`.
   - Na seção INTEGRAÇÕES (linha ~244), adicionar `<PillButton icon={IdCard} onClick={() => setShowCartao(true)}>Cartão Credencial</PillButton>` ao lado de "Credenciais Judit".
   - Renderizar `<CartaoCredencialDialog ... />` junto aos outros dialogs (linha ~299).

2. **`src/components/SuperAdmin/TenantRowMobile.tsx`**
   - Mesmas alterações no equivalente mobile (linha ~211 / ~251).

## Arquivos afetados
- `src/components/SuperAdmin/TenantRow.tsx`
- `src/components/SuperAdmin/TenantRowMobile.tsx`

## Impacto
- **Usuário final:** o botão "Cartão Credencial" passa a aparecer na faixa INTEGRAÇÕES de todos os tenants (desktop e mobile), abrindo o dialog já criado para gerenciar apelidos.
- **Dados:** nenhum. Apenas UI.
- **Riscos colaterais:** nenhum — reaproveita componente e RPC existentes.
- **Quem é afetado:** apenas super-admins na tela `/super-admin`.

## Validação
- Abrir `/super-admin`, expandir um tenant e confirmar que o botão aparece em INTEGRAÇÕES (entre "Credenciais Judit" e "Chamadas Judit") tanto em desktop quanto mobile.
- Clicar e verificar que o `CartaoCredencialDialog` abre e lista credenciais com edição inline do apelido.