
Objetivo: corrigir os 2 pontos que você relatou, porque hoje eles estão incompletos no código.

1. Diagnóstico encontrado

- Busca rápida do CRM:
  - `src/components/WhatsApp/components/CRMQuickSearch.tsx` ainda está na versão antiga.
  - O componente continua usando `<Input>` separado do `<Command>` e não existe `onKeyDown`, nem estado de item destacado.
  - Por isso as setas do teclado realmente não fazem nada hoje.

- Marcação “cumprir etapa” na conclusão do prazo:
  - Essa opção já existe em:
    - `src/components/Agenda/DeadlineDetailDialog.tsx`
    - `src/components/Agenda/AgendaContent.tsx`
  - Mas ela não existe no fluxo de conclusão de prazo dentro de:
    - `src/components/Project/ProjectProtocoloContent.tsx`
  - Esse arquivo ainda usa um modal antigo de “Concluir Prazo”, sem checkbox para concluir a etapa vinculada.
  - Então, se você estava concluindo o prazo por dentro do projeto/protocolo, é esperado mesmo não ver essa marcação.

2. O que vou implementar

- Busca rápida:
  - adicionar navegação por teclado com:
    - seta para baixo
    - seta para cima
    - Enter para selecionar
    - Escape para fechar
  - manter o foco no input durante a navegação
  - destacar visualmente o item ativo
  - limitar a navegação aos resultados visíveis

- Conclusão de prazo com opção de cumprir etapa:
  - levar a mesma lógica já existente na Agenda para `ProjectProtocoloContent`
  - exibir o checkbox “Cumprir etapa do protocolo” quando o prazo tiver `protocolo_etapa_id`
  - deixar marcado por padrão quando a etapa ainda não estiver concluída
  - ao confirmar, concluir também a etapa na tabela `project_protocolo_etapas`
  - esconder a opção se a etapa já estiver concluída

3. Arquivos que precisam ser ajustados

- `src/components/WhatsApp/components/CRMQuickSearch.tsx`
- `src/components/Project/ProjectProtocoloContent.tsx`

4. Como vou fazer

- Em `CRMQuickSearch.tsx`
  - adicionar estado `highlightedIndex`
  - criar `visibleResults = filteredProjects.slice(0, 5)`
  - tratar `onKeyDown` no input
  - aplicar classe visual no item destacado
  - selecionar o item com Enter usando `handleSelect`
  - fechar com Escape e resetar o índice quando a busca mudar

- Em `ProjectProtocoloContent.tsx`
  - adicionar estados:
    - `cumprirEtapa`
    - `etapaJaConcluida`
  - ao abrir o modal de conclusão, buscar o status atual da etapa vinculada
  - renderizar o checkbox no modal de “Concluir Prazo”
  - no `toggleDeadlineCompletion`, se estiver concluindo e o checkbox estiver ativo:
    - atualizar `project_protocolo_etapas`
    - `status = 'concluido'`
    - `data_conclusao = now()`
    - `comentario_conclusao = comentarioConclusao`
  - resetar esses estados ao fechar o modal

5. Detalhes técnicos

- Motivo do bug da busca:
  - hoje não existe nenhuma lógica de teclado no input
  - o `cmdk` não está controlando o mesmo campo de entrada, então a navegação nativa não entra em ação

- Motivo do checkbox “não aparecer”:
  - ele foi implementado só nos componentes da Agenda
  - o fluxo de prazo dentro do protocolo/projeto usa outro modal, separado, ainda sem essa funcionalidade

- Cuidados na implementação:
  - não alterar a seleção via mouse já existente
  - não quebrar o dispatch `crm-open-project`
  - preservar comentário obrigatório
  - só mostrar “cumprir etapa” quando houver `protocolo_etapa_id`
  - não tentar reconcluir etapa já concluída

6. Validação após implementação

- Busca rápida:
  - digitar termo
  - usar setas para subir/descer
  - Enter abrir o projeto certo
  - Escape fechar
  - testar também quando houver 0, 1 e vários resultados

- Conclusão de prazo:
  - testar pela Agenda
  - testar pelo modal dentro de Projeto/Protocolo
  - validar prazo com etapa vinculada e sem etapa vinculada
  - validar etapa já concluída e etapa pendente
