## Causa raiz

O drawer atual de "Movimentos manuais" é um diálogo pequeno com uma lista crua de CNJs e nada mais. O super admin pediu o **mesmo visual que o usuário do tenant tem na aba OAB**: drawer em tela cheia, processos listados como tabela, clique no processo abre painel de detalhes (andamentos, status de monitoramento) e dali consegue adicionar um movimento manual.

Reaproveitar o `OABTab` / `ProcessoOABDetalhes` originais não é viável: ambos dependem do `tenantId` do contexto + RLS por tenant. Para super admin cross-tenant, precisamos de telas paralelas alimentadas por edge functions com service role (mesmo padrão de `super-admin-criar-andamento-manual` já em uso).

## Correção

1. **Substituir o `Dialog` pequeno por um drawer fullscreen** (`Sheet` lateral à direita, largura ~`max-w-6xl`) replicando o look da OABTab: header com nome do tenant, busca, tabela com CNJ / partes / tribunal / nº de andamentos / monitoramento. Preserva-se a busca local já existente.

2. **Novo painel de detalhes do processo (super admin)** — ao clicar numa linha, abre painel interno (split à direita ou drawer aninhado) replicando o visual de `ProcessoOABDetalhes`, mostrando:
   - Cabeçalho com CNJ, partes, tribunal, classe, vara.
   - Bloco "Monitoramento": status (ativo / pausado), última verificação, próximas datas previstas, fonte (Escavador/Judit) — somente leitura.
   - Lista de andamentos (com badge "Manual" para `dados_completos.origem === 'manual'`, igual ao tenant vê).
   - Anexos manuais com link assinado (já implementado).
   - Botão primário **"Adicionar movimento manual"** que abre o `AdicionarMovimentoManualDialog` existente (já funcional).

3. **Edge functions**:
   - `super-admin-listar-processos-oab` (já existe). **Adicionar** ao retorno: contagem de andamentos por processo e flag `monitoramento_ativo` para popular a tabela.
   - **Nova** `super-admin-processo-oab-detalhes`: recebe `processo_oab_id`, valida super admin, retorna via service role:
     - Processo completo (`processos_oab.*`).
     - Andamentos (`processos_oab_andamentos` ordenados por data desc, com `dados_completos`).
     - Anexos (`processos_oab_anexos`).
     - Status de monitoramento (`processo_oab_monitoramento_escavador`).
   - `super-admin-criar-andamento-manual` (já existe, continua igual).

4. **Componentização** (sem mexer nos arquivos do tenant):
   - `SuperAdminMovimentosManuaisDrawer.tsx`: trocar de `Dialog` para `Sheet` fullscreen + tabela.
   - Novo `SuperAdminProcessoOABDetalhesPanel.tsx`: painel/sub-drawer espelhando o visual de `ProcessoOABDetalhes` em modo somente-leitura, alimentado pela nova edge function.

## Arquivos afetados

- `supabase/functions/super-admin-listar-processos-oab/index.ts` (estender o retorno).
- `supabase/functions/super-admin-processo-oab-detalhes/index.ts` (novo).
- `src/components/SuperAdmin/SuperAdminMovimentosManuaisDrawer.tsx` (refatorar para sheet fullscreen + tabela).
- `src/components/SuperAdmin/SuperAdminProcessoOABDetalhesPanel.tsx` (novo).
- `src/components/SuperAdmin/AdicionarMovimentoManualDialog.tsx` (sem mudanças funcionais, apenas reaproveitado a partir do novo painel).

## Impacto

- **UX**: Super admin clica "Movimentos manuais" → drawer toma a tela com lista de processos do tenant, idêntica à visão do usuário do tenant. Clicar num processo revela detalhes completos (monitoramento + andamentos + anexos) e botão "Adicionar movimento" abre o dialog existente. Mais ergonômico para auditar antes de inserir.
- **Dados**: Sem migration, sem mudança de RLS — toda leitura cross-tenant continua exclusivamente pela edge function com service role e validação de super admin no Bearer. Performance: lista de processos paginada de 1000 em 1000 no servidor; detalhes de um processo são uma única chamada por seleção.
- **Riscos colaterais**: baixos. Nenhuma alteração nos componentes do tenant (`OABTab`, `ProcessoOABDetalhes`, hook `useProcessosOAB`). O novo painel é somente leitura — super admin não toggla monitoramento, não exclui processos, não edita partes. A única operação de escrita continua sendo "criar andamento manual" via função já existente.
- **Quem é afetado**: apenas super admins (Daniel). Usuários comuns continuam sem qualquer mudança.

## Validação

1. Super admin abre Solvenza → "Movimentos manuais": drawer fullscreen mostra todos os processos OAB do tenant com CNJ, partes, tribunal e contagem de andamentos.
2. Busca por CNJ/parte filtra corretamente.
3. Clicar num processo: painel mostra cabeçalho do processo, status de monitoramento (ativo/pausado), lista de andamentos com badges (incluindo "Manual" quando aplicável) e anexos com link assinado.
4. Botão "Adicionar movimento manual" abre o dialog existente; ao salvar, o novo andamento aparece imediatamente no painel e na Central de Não Lidos do tenant.
5. Logar como usuário comum de outro tenant e tentar invocar `super-admin-processo-oab-detalhes` → 403.
