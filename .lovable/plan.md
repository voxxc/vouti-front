## Causa raiz

A aba "Andamentos" do detalhe do processo OAB mostra uma tela vazia com botão **"Carregar Andamentos"** sempre que `!processo.detalhes_request_id && andamentos.length === 0`. Esse botão dispara `onCarregarDetalhes` → `carregarDetalhes` (em `useOABs`/`useAllProcessosOAB`) que chama a Escavador para popular a primeira leva de andamentos. Existe ainda uma versão em lote no `OABManager` (`carregarDetalhesLote` em `useOABs`) com um `AlertDialog` de confirmação. Você quer remover essa funcionalidade do sistema inteiro.

## Correção

1. **`ProcessoOABDetalhes.tsx`** (Controladoria, usado também por Agenda, ProjectProcessos, CentralAndamentosNaoLidos):
   - Remover o bloco da empty-state "Andamentos não carregados" (linhas ~1427-1453) e o `AlertDialog` de confirmação (linhas ~1625-1642). No lugar, manter apenas uma mensagem neutra de "Nenhum andamento" quando a lista estiver vazia.
   - Remover o handler `handleCarregarAndamentos`, o state `carregandoAndamentos`, o state `confirmDialogOpen` e a prop `onCarregarDetalhes` da interface.

2. **Removendo a prop nos chamadores:**
   - `src/components/Controladoria/GeralTab.tsx` (linha 529) — apagar `onCarregarDetalhes={carregarDetalhes}` e o desestruturar do hook se não usado em outro lugar.
   - `src/components/Controladoria/OABTab.tsx` (linha 478) — idem.
   - `src/components/Project/ProjectProcessos.tsx` (linha 1111) — idem; remover `handleCarregarDetalhes` se ficar órfão.
   - `src/components/Agenda/AgendaContent.tsx` e `CentralAndamentosNaoLidos.tsx` — verificar e tirar a prop se passada.

3. **`OABManager.tsx`**:
   - Remover o `AlertDialog` de "Carregar Andamentos" em lote (linhas ~434-483), os states `lawsuitBatchDialogOpen`, `batchProcessos`, `batchProgress`, `selectedOabForBatch` e os handlers `handleCarregarDetalhesLote`, `handleConfirmarCarregarLote`. Remover o import/uso de `carregarDetalhesLote` do `useOABs`.

4. **Hooks** (`src/hooks/useOABs.ts` e `src/hooks/useAllProcessosOAB.ts`):
   - Deletar as funções `carregarDetalhes` e `carregarDetalhesLote` e seus retornos no objeto exportado. Limpar imports/states que ficarem órfãos.

5. **Edge function** `escavador-importar-processo`: **manter**. Ela continua sendo usada no fluxo automático de importação (`ImportarProcessoDialog`), que não é a funcionalidade que você pediu para remover. Só o gatilho manual do botão sai.

## Arquivos afetados

- `src/components/Controladoria/ProcessoOABDetalhes.tsx`
- `src/components/Controladoria/GeralTab.tsx`
- `src/components/Controladoria/OABTab.tsx`
- `src/components/Controladoria/OABManager.tsx`
- `src/components/Project/ProjectProcessos.tsx`
- `src/components/Agenda/AgendaContent.tsx` (se passar a prop)
- `src/components/Controladoria/CentralAndamentosNaoLidos.tsx` (se passar a prop)
- `src/hooks/useOABs.ts`
- `src/hooks/useAllProcessosOAB.ts`

## Impacto

- **Usuário final:** a aba "Andamentos" deixa de exibir o card azul com botão "Carregar Andamentos". Processos sem andamentos passam a mostrar apenas "Nenhum andamento" (mensagem neutra). O botão de **Atualizar** (refresh) ao lado da contagem continua existindo — ele só aparece quando já existe `detalhes_request_id` e serve para reconsultar o tribunal, então não é a mesma funcionalidade. No `OABManager`, somem os states/dialog em lote (não há botão acionando hoje, então sem impacto visível extra).
- **Dados:** nenhuma migration, nada removido do banco. Andamentos já existentes permanecem.
- **Riscos colaterais:** processos antigos que nunca tiveram andamentos buscados vão ficar permanentemente vazios na aba até que entrem pelo fluxo automático de importação ou monitoramento — não haverá mais um botão manual para forçar a primeira busca. Importações novas (via `ImportarProcessoDialog`) continuam carregando em background, então o fluxo padrão de criação não muda.
- **Quem é afetado:** todos os usuários que abrem o detalhe de um processo OAB (Controladoria, Agenda, Projetos, Central de andamentos). Super-admin não é afetado — esse painel é independente.

## Validação

1. Abrir um processo OAB sem andamentos: aba "Andamentos" mostra mensagem neutra, **sem botão** "Carregar Andamentos".
2. Abrir um processo OAB com andamentos: lista normal aparece; botão de Atualizar (ícone refresh ao lado da contagem) continua funcionando.
3. Conferir no `OABManager` que não há referências a `lawsuitBatchDialogOpen` / `carregarDetalhesLote` (build limpo, sem warnings de variáveis não usadas).
4. `rg "Carregar Andamentos"` deve retornar zero resultados em `src/`.
