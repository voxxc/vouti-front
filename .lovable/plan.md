## Causa raiz

- O prazo existe no banco e está correto para a Agenda:
  - **Título:** `(FATAL 27/05) COMPROVAR JG - Nº 5000599-96.2026.8.21.0092`
  - **Responsável:** Alan Claudio Maran
  - **Módulo:** `legal`
  - **Status:** aberto
  - **Data gravada:** `2026-05-22`
  - **Tenant:** SOLVENZA
- O motivo principal de ele não aparecer é o **limite padrão do Supabase de 1000 registros por consulta**.
- A Agenda busca os prazos ordenados por data sem paginação. Esse prazo está na posição **1002** da lista da SOLVENZA, então ele fica fora do retorno inicial.
- Isso também afeta outros prazos próximos: identifiquei registros a partir da posição 1001 que também podem não aparecer na Agenda.
- Além disso, a busca atual filtra os dados, mas a tela principal continua presa à **data selecionada**. Então, mesmo pesquisando por um prazo de 22/05, a área visível pode continuar mostrando “Sem prazos para esta data” se o calendário estiver em 12/05.

## Correção

1. **Corrigir o carregamento da Agenda**
   - Alterar a busca de prazos para carregar em páginas/lotes usando `.range(...)`, até trazer todos os prazos visíveis pela RLS.
   - Manter o filtro por `module='legal'` e respeitar o `tenant_id`/RLS existente.
   - Isso elimina a dependência perigosa do limite implícito de 1000 registros.

2. **Evitar recorrência em outros pontos da Agenda/Planejador**
   - Aplicar o mesmo padrão no hook `useAgendaData`, usado na visão de prazos do Planejador.
   - Revisar os pontos que listam prazos por caso/projeto para garantir que consultas pequenas e contextuais não estejam sendo afetadas pelo mesmo limite.

3. **Melhorar o comportamento da busca na Agenda**
   - Quando houver texto na busca, exibir uma seção clara de **Resultados da busca**, independente da data selecionada no calendário.
   - Assim, ao buscar pelo CNJ ou pelo título, o prazo aparece imediatamente, mesmo se o dia selecionado for outro.

4. **Manter a regra de participação já corrigida**
   - Continuar usando o critério unificado: criador, advogado responsável, usuários marcados e concluído_por.
   - Para o caso informado, Alan aparece porque é `advogado_responsavel_id` do prazo.

## Arquivos afetados

- `src/components/Agenda/AgendaContent.tsx`
  - Paginar o carregamento dos prazos.
  - Ajustar a visualização quando houver busca ativa.

- `src/hooks/useAgendaData.ts`
  - Paginar o carregamento usado em outras telas que consomem dados da Agenda/Planejador.

- Possivelmente `src/components/Controladoria/PrazosCasoTab.tsx`
  - Apenas se a revisão confirmar risco real de limite em listagens de prazos por caso.

## Impacto

1. **Usuário final / UX**
   - O prazo do Alan passa a aparecer na Agenda sem depender de refresh, truques ou filtros manuais.
   - Outros prazos além dos primeiros 1000 também passam a aparecer.
   - Ao pesquisar por título/CNJ, o resultado aparece diretamente, mesmo que a data selecionada no calendário seja diferente.

2. **Dados / migrations / RLS / performance**
   - Não precisa migration.
   - Não altera RLS.
   - Não altera dados existentes.
   - A Agenda fará mais de uma chamada quando houver mais de 1000 prazos, mas em lotes controlados; é mais correto e previsível do que perder registros.

3. **Riscos colaterais**
   - A primeira carga da Agenda pode ficar um pouco mais pesada em tenants com muitos prazos.
   - Para reduzir risco, a paginação será limitada a lotes e reaproveitará o mapeamento atual sem mudar a estrutura visual principal.

4. **Quem é afetado**
   - Todos os usuários da Agenda jurídica (`legal`) no tenant SOLVENZA e em outros tenants com muitos prazos.
   - Admins/controllers e advogados, incluindo Alan.
   - Planejador, caso use o hook `useAgendaData` para mostrar prazos.

## Validação

- Confirmar no banco que o prazo `16b84fd9-8ea0-4805-a114-9f3db7e22c17` está incluído após a paginação.
- Validar que prazos nas posições acima de 1000 aparecem na Agenda.
- Validar busca por:
  - `COMPROVAR JG`
  - `5000599-96.2026.8.21.0092`
  - `Alan`
- Conferir que filtros por usuário continuam respeitando criador, responsável, marcado e concluído_por.
- Garantir que não houve alteração em permissões/RLS nem exposição indevida entre tenants.