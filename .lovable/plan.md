# Reordenar tokens e carteiras 2FA com botão de cadeado

## Objetivo
Adicionar um botão de cadeado no painel "Autenticador 2FA" (TOTPSheet). Quando destravado, o usuário pode arrastar tokens dentro de cada carteira — e também arrastar as próprias carteiras — para reorganizar a ordem. A ordem é persistida e respeitada por todos que visualizam aquela carteira/tenant.

Inspiração: mesmo padrão já usado no Planejador (`PlanejadorTopBar` + `PlanejadorDrawer`) com ícones `Lock`/`Unlock` da `lucide-react`.

## Como funciona
- Estado `locked` (default `true`) no `TOTPSheet`.
- Botão de cadeado no header do Sheet, ao lado do título: `Lock` (âmbar) quando travado, `Unlock` quando destravado.
- Quando `locked = false`:
  - Cada `WalletCard` ganha um "handle" de arrastar (ícone `GripVertical`) à esquerda.
  - Cada `TokenRow` ganha um handle de arrastar à esquerda.
  - Demais ações (copiar código, editar, excluir) ficam desabilitadas para evitar cliques acidentais durante reorganização.
- Ao soltar:
  - Carteira → atualiza `sort_order` em `totp_wallets`.
  - Token → atualiza `sort_order` em `totp_tokens` (reorder somente dentro da mesma carteira; mover entre carteiras fica fora do escopo).
- Quando `locked = true` (default), volta ao comportamento normal de hoje.

## Arquivos afetados
- Migração nova (Supabase):
  - `ALTER TABLE totp_wallets ADD COLUMN sort_order int NOT NULL DEFAULT 0;`
  - `ALTER TABLE totp_tokens ADD COLUMN sort_order int NOT NULL DEFAULT 0;`
  - Backfill `sort_order` por `created_at` (`row_number()` particionado por `tenant_id` para wallets e por `wallet_id` para tokens).
- `src/hooks/useTOTPData.ts`: ordenar `wallets` por `sort_order, created_at`; ordenar `tokens` por `sort_order, created_at`. Adicionar mutações `reorderWallets(orderedIds)` e `reorderTokens(walletId, orderedIds)` que fazem `update` em lote por id (RLS já restringe ao tenant).
- `src/components/Dashboard/TOTPSheet.tsx`: estado `locked`, botão de cadeado no header, contexto `DndContext` (usando `@dnd-kit/core` + `@dnd-kit/sortable`, já presentes no projeto se disponíveis; caso contrário, instalar) envolvendo a lista de carteiras; `onDragEnd` chama `reorderWallets`.
- `src/components/Dashboard/TOTP/WalletCard.tsx`: aceitar `locked` via prop; quando destravado, mostrar handle de drag e envolver os tokens em `SortableContext`; `onDragEnd` chama `reorderTokens(wallet.id, ...)`.
- `src/components/Dashboard/TOTP/TokenRow.tsx`: aceitar `locked`; quando destravado, mostrar `GripVertical` à esquerda e desabilitar copy/edit/delete.

## Impacto
1. **Usuário final (UX)**: novo cadeado no topo da gaveta de tokens. Default travado — nada muda no fluxo atual. Ao destravar, surgem handles de arrastar; basta arrastar e soltar para reordenar carteiras e tokens. A ordem fica salva e visível para todos os usuários que enxergam aquela carteira.
2. **Dados**: duas colunas novas (`sort_order int`) em `totp_wallets` e `totp_tokens`, com backfill determinístico por `created_at`. Sem perda de dados, sem alteração em RLS, sem mudança em secrets/secret encryption.
3. **Riscos colaterais**: mínimos. A reordenação é só visual; o cálculo TOTP independe da ordem. Updates em lote respeitam as policies de RLS existentes (somente quem já pode editar a carteira/token consegue reordenar). O default `locked=true` evita reordenações acidentais.
4. **Quem é afetado**: todos os usuários do tenant que abrem o Autenticador 2FA — a ordenação é compartilhada por carteira/tenant (não é preferência por usuário).

## Validação
- Abrir 2FA: cadeado travado, comportamento idêntico ao atual.
- Destravar → arrastar token A para acima do token B na mesma carteira → recarregar página → ordem permanece.
- Destravar → arrastar carteira para nova posição → recarregar → ordem persiste.
- Outro usuário (com acesso à carteira) abre o painel → enxerga a mesma ordem.
- Travar de novo → cliques em copiar/editar/excluir voltam a funcionar; handles somem.
- `select id, name, sort_order from totp_wallets order by sort_order` retorna sequência estável.
