# Mover "Importações" para botão ao lado de "Cadastrar OAB"

## Mudança
Remover a aba "Importações" do menu de abas (underline) do `OABManager` e substituir por um botão de ícone (Inbox) ao lado do botão **Cadastrar OAB**, no header. Ao clicar, abre o mesmo conteúdo (`ImportacoesTab`) em um Dialog/Sheet.

## Arquivos afetados
- `src/components/Controladoria/OABManager.tsx`
  - Remover o `<button>` da aba `importacoes` (linhas ~301–310) e o `<TabsContent value="importacoes">` (linhas ~335–339).
  - Adicionar um `Button` ghost com ícone `Inbox` (tooltip "Importações") ao lado de "Cadastrar OAB" no header (visível só se `canImportCNJ`).
  - Adicionar `Dialog` (ou `Sheet`) controlado por `importDialogOpen`, renderizando `<ImportacoesTab />` dentro.
  - Ajustar o trecho `setActiveTab('importacoes')` (linha ~511) para abrir o novo dialog em vez de trocar de aba.

## Impacto
- **UX**: a aba "Importações" some do menu underline; aparece como ícone discreto (Inbox) ao lado de "Cadastrar OAB". Conteúdo idêntico, agora em modal.
- **Dados**: nenhum. Sem migration, sem RLS, sem novas queries.
- **Riscos colaterais**: qualquer link/atalho que disparava `setActiveTab('importacoes')` precisa abrir o dialog — já mapeado o ponto na linha 511.
- **Afetados**: apenas usuários com `canImportCNJ` (admin que importa CNJ). Demais usuários não veem diferença.

## Validação
- Abrir Controladoria > OABs: confirmar que a aba "Importações" sumiu do menu underline.
- Confirmar ícone Inbox visível ao lado de "Cadastrar OAB" (apenas admin com permissão).
- Clicar no ícone abre o dialog com `ImportacoesTab` funcionando (jobs listados, importar planilha etc.).
- Conferir que nenhum fluxo que antes chamava `setActiveTab('importacoes')` ficou quebrado.
