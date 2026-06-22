
## Causa raiz

Hoje o botão "Salvar movimento(s)" em `AdicionarMovimentoManualDialog.tsx` faz tudo de forma síncrona e bloqueante:

1. Valida abas
2. Para cada aba, em série: converte arquivo para base64 → invoca `super-admin-criar-andamento-manual` → espera resposta
3. Só então fecha o dialog e chama `onSuccess()` (que recarrega a lista no drawer)

Como cada anexo pode ter até 25 MB e a função roda em série, o usuário fica preso vendo o spinner por vários segundos por movimento.

## Correção

Implementar **salvamento otimista em segundo plano**:

1. Ao clicar em "Salvar":
   - Validar abas (mesmas regras de hoje — data + nome do movimento)
   - Mostrar spinner por ~150 ms só para dar feedback visual de clique
   - Fechar o dialog imediatamente
   - Disparar um toast persistente: "Salvando N movimento(s) em segundo plano…" (com `toast.loading` do sonner)

2. Em segundo plano (Promise não-aguardada, fora do ciclo de vida do dialog):
   - Iterar pelas abas na mesma ordem atual (da mais antiga para a mais nova)
   - Para cada aba: ler arquivo → invocar edge function
   - Atualizar o toast a cada sucesso ("2 de 3 salvos…") via `toast.message` no mesmo id
   - Ao final: substituir o toast por `toast.success` ("N movimentos lançados") e chamar `onSuccess()` para recarregar a tabela do drawer
   - Em caso de erro em alguma aba: `toast.error` informando quais foram salvos e qual falhou, e ainda assim chamar `onSuccess()` (lista reflete o que entrou)

3. Pequenas melhorias de performance que cabem aqui:
   - Paralelizar as invocações com `Promise.allSettled` (em vez de série), já que cada movimento é independente no backend e o anexo vai por payload separado. Mantém ordem de exibição pela `data_movimentacao` + `super_admin_ordem` que o backend já calcula.
   - Manter o usuário livre para abrir outro processo / outro dialog enquanto o lote roda.

4. Robustez:
   - Usar uma fila/registro em memória no nível do drawer (ou um pequeno contexto local) para que o toast e o `onSuccess()` continuem vivos mesmo se o usuário fechar o dialog/trocar de aba dentro do drawer. Implementação simples: a Promise é criada dentro do handler e mantida viva pelo próprio runtime; o toast usa um `id` estável para atualizar/fechar.
   - Se o usuário clicar duas vezes muito rápido, manter o guard `salvandoRef` só durante a fase de validação + disparo (não durante o background).

## Arquivos afetados

- `src/components/SuperAdmin/AdicionarMovimentoManualDialog.tsx` — refatorar `handleSalvar`:
  - Validar → fechar dialog → disparar background task com `Promise.allSettled` → toasts com `id` estável.
  - Remover o estado `salvando` do botão "Salvar" depois do fechamento (botão deixa de existir junto com o dialog).
- `src/components/SuperAdmin/SuperAdminMovimentosManuaisDrawer.tsx` — expor `onSuccess` que aceita ser chamado depois (já é assim hoje). Sem mudança estrutural; só garantir que `onSuccess` recarrega a página atual da lista, o que já faz.

Nenhuma mudança em edge function nem em DB.

## Impacto

1. **UX (usuário final):** clique em "Salvar" fecha o diálogo em <200 ms. O usuário volta imediatamente para a tabela de processos do drawer e pode continuar trabalhando (abrir outro processo, filtrar, etc.). Toast no canto mostra o progresso ("Salvando…", "3 movimentos lançados"). Em caso de falha, toast vermelho identifica quais abas falharam.
2. **Dados:** nenhum impacto. Mesmo edge function, mesma migration, mesmo schema. A diferença é que as N chamadas passam a rodar em paralelo (`Promise.allSettled`) em vez de série — o backend já é stateless e calcula `super_admin_ordem` por linha, então a ordem final continua correta porque cada insert lê o `max(super_admin_ordem)` no momento. Pequeno risco de empate de ordem em lote grande do mesmo processo: mitigado mantendo o disparo em série quando todas as abas são do mesmo processo (que é sempre o caso aqui — o dialog é por processo). **Decisão:** manter série dentro do mesmo processo para preservar a ordem de reordenação manual; o ganho de UX vem de fechar o dialog imediatamente, não da paralelização.
3. **Riscos colaterais:**
   - Se o usuário fechar a aba do navegador antes do background terminar, os movimentos pendentes se perdem. Mitigação: `beforeunload` listener enquanto houver lote em andamento, avisando "Há movimentos sendo salvos. Sair mesmo assim?".
   - Anexo grande (25 MB) ainda demora para subir — mas agora sem travar a UI.
4. **Quem é afetado:** apenas super-admins usando o drawer de Movimentos Manuais. Nenhum efeito em tenants, advogados ou outras telas.

## Validação

1. Abrir um processo no drawer de Movimentos Manuais, adicionar 3 abas com anexos diferentes, clicar Salvar → dialog fecha em <500 ms, toast aparece, tabela atualiza ao final.
2. Forçar erro (ex.: extensão inválida em uma das abas) → toast.error identifica a aba; abas válidas são salvas.
3. Tentar fechar a aba do navegador durante o salvamento → prompt do `beforeunload`.
4. Conferir nos logs da edge function `super-admin-criar-andamento-manual` que as inserções mantêm `super_admin_ordem` sequencial quando aplicável.
