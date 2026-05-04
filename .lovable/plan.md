# Loading e prevenção de cliques duplos ao abrir ficha do lead

## Problema
Ao clicar em "Ver ficha do lead" (no nome no card ou botão no modal), há latência (busca/cria cliente, depois `fetchClientes()`). O usuário clica várias vezes e o modal abre repetidamente.

## Mudanças

### 1. `src/components/Reunioes/ReunioesContent.tsx`
- Adicionar estado `loadingClienteReuniaoId: string | null`.
- No `handleAbrirCliente`:
  - Se já está carregando, retornar (debounce/guard).
  - Setar `loadingClienteReuniaoId = reuniao.id` no início.
  - **Otimização**: abrir o dialog imediatamente após resolver `clienteId` (antes do `fetchClientes`), e deixar o dialog mostrar skeleton enquanto `cliente` ainda é `null`.
  - Limpar loading no `finally`.
- Passar `loadingId` ao `ReuniaoCard` via prop.

### 2. `src/components/Reunioes/ReuniaoCard.tsx`
- Aceitar prop `isLoadingLead?: boolean`.
- No nome clicável: quando `isLoadingLead`, mostrar `<Loader2 className="animate-spin" />` ao lado do nome e desabilitar o botão (`disabled`, `pointer-events-none`).

### 3. `src/components/Reunioes/ClienteDetalhesDialog.tsx`
- Em vez de retornar `null` quando `cliente` é `null` mas `open` é `true`, renderizar o `Dialog` com um skeleton/spinner de loading no body. Isso permite abrir o modal instantaneamente.

### 4. Botão "Ver ficha do lead" no modal de detalhes (ReunioesContent.tsx)
- Adicionar estado de loading local; mostrar `<Loader2 spin />` e `disabled` enquanto resolve.

## Resultado
- Clique único bloqueia novos cliques (sem reabertura).
- Feedback visual imediato (spinner no card e modal abrindo com skeleton).
- Percepção de velocidade muito maior.
