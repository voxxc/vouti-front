Adicionar a informação da comarca do processo OAB vinculado na aba **Resumo** do protocolo, na seção de dados do processo (grid ao lado de Data de Início, Previsão, Responsável, etc.).

A comarca já existe no banco: `processos_oab.capa_completa->>'county'` (ex.: "1ª VARA CÍVEL DA COMARCA DE VIÇOSA"). O componente `ProjectProtocoloContent` já carrega o `processoVinculado` via `useProtocoloVinculo`, então basta exibir `processoVinculado?.capa_completa?.county` quando houver processo vinculado.

## Arquivos afetados
- `src/components/Project/ProjectProtocoloContent.tsx` — adicionar linha "Comarca" no grid de dados da tab "resumo"

## Impacto
- **UX:** Usuário vê a comarca do processo diretamente no Resumo do protocolo, sem precisar abrir a aba Vínculo ou consultar o Judit.
- **Dados:** Zero alteração no banco (coluna `capa_completa` já existe). Somente leitura no frontend.
- **Riscos:** Nenhum — campo é opcional (só aparece se houver processo vinculado com `county` preenchido). String exibida é a original da Judit, sem parsing.
- **Quem é afetado:** Todos os usuários que visualizam protocolos vinculados a processos OAB com dados do Judit.

## Validação
- Abrir um protocolo com processo OAB vinculado → na aba Resumo, aparece linha "Comarca" com o valor de `capa_completa.county`.
- Protocolo sem vínculo ou sem `county` → linha não aparece (sem impacto visual).