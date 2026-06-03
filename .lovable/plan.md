## Causa raiz
A aba **Indicadores** (Controladoria) hoje agrupa processos por **tribunal** (`processos_oab.tribunal_sigla`), mas não tem visão por **comarca**. Os dados de comarca já existem em `processos_oab.capa_completa->>'city'` (ex.: "VIÇOSA", "CASCAVEL"), trazidos pela Judit — só não estavam sendo usados.

## Correção
Adicionar uma **terceira sub-aba** na seção Indicadores chamada **"Processos por Comarca"**, ao lado de "Indicadores de Prazos" e "Processos por Tribunal".

### O que a aba mostra
- Card no topo com totais agregados: total de processos analisados, total de comarcas distintas, processos sem comarca identificada.
- Campo de busca para filtrar por nome de comarca.
- Lista agrupada por comarca, ordenada pela quantidade (decrescente), cada item com:
  - Nome da comarca (capitalizado).
  - Badge com a contagem e a porcentagem do total.
  - Barra de progresso visual (mesmo padrão da aba Tribunal).
  - Linha expansível: ao clicar, abre a lista dos processos daquela comarca mostrando **número CNJ, parte ativa × parte passiva e tribunal**. Sem abrir o resumo — é puramente informativo.
- Botão "Imprimir / PDF" reutilizando o padrão da aba de Prazos, gerando um relatório com o agrupamento.

### Regras de agrupamento
- Chave de agrupamento: `capa_completa->>'city'` normalizado (trim, uppercase) para evitar duplicatas tipo "VIÇOSA" vs "Viçosa". Exibição usa capitalização adequada (primeira letra de cada palavra).
- Fallback quando `city` está vazio mas `county` tem padrão "COMARCA DE X" ou "X - VARA ...": extrair o nome via regex simples.
- Processos sem nenhuma das duas informações vão para o grupo **"Sem comarca identificada"** (exibido por último, em cinza).
- Deduplicação por `numero_cnj` (um mesmo processo cadastrado em duas OABs conta uma vez só) — segue o mesmo princípio já usado em `useAllProcessosOAB`.

## Arquivos afetados
- `src/components/Controladoria/ControladoriaIndicadores.tsx` — adicionar:
  - Novo estado `activeSubTab` aceitando `'comarca'`.
  - Novo botão na barra de sub-abas.
  - Novo `useEffect` / `useMemo` para agregar por comarca (reaproveita o fetch existente, só amplia o `select` para incluir `numero_cnj, parte_ativa, parte_passiva, capa_completa`).
  - Novo bloco JSX renderizando a lista agrupada + expansão + impressão.
- Sem migrations, sem mudanças em hooks compartilhados.

## Impacto
- **UX:** Controller/admin passa a ter, dentro de Indicadores, uma terceira visão útil para decisões operacionais ("onde estão concentrados meus processos?"). Layout consistente com a aba "Processos por Tribunal" já existente.
- **Dados:** Zero alteração no banco. Apenas amplia o `select` que já roda hoje (`processos_oab`), trazendo 3 colunas a mais (`numero_cnj`, `parte_ativa`, `parte_passiva`, `capa_completa`). Mantém `fetchAllPaginated` para respeitar o limite de 1000 linhas. `tenant_id` continua filtrando — isolamento garantido.
- **Riscos:** Carga ligeiramente maior por linha (campo `capa_completa` é jsonb e pode ser grande). Para escritórios com milhares de processos isso pode aumentar o tempo do fetch da aba Indicadores. Mitigação: selecionar apenas as chaves necessárias via `capa_completa->>'city'` e `capa_completa->>'county'` no `.select()` (PostgREST suporta), não puxar o jsonb inteiro.
- **Quem é afetado:** Apenas usuários com acesso à Controladoria (admin, controller). Nenhum advogado/estagiário/agenda é impactado. Multi-tenant preservado.

## Validação
- Abrir Controladoria → Indicadores → clicar em **"Processos por Comarca"**.
- Conferir contagem total bate com a aba "Processos por Tribunal" (mesmo universo de processos).
- Comarcas conhecidas (VIÇOSA, CASCAVEL, PIRANGA, JARU — confirmadas no banco) aparecem na lista com contagem correta.
- Buscar "vico" filtra para Viçosa.
- Expandir uma comarca lista os processos (CNJ + partes) — sem abrir resumo.
- Imprimir gera PDF com o agrupamento.
- Aba "Sem comarca identificada" agrupa só processos sem `city` e sem `county`.