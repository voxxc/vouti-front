## Causa raiz
O modo "Editar" do Resumo em `ProcessoOABDetalhes.tsx` cobre apenas 10 campos básicos (partes, valor, distribuição, status, fase, juízo, link, tribunal, sigla). Campos importantes mostrados na tela — Classe/Tipo, Assunto, Área, Juiz, Instância, Estado/Cidade — são exibidos somente leitura, vindos de `capa_completa` (JSONB). A data em que o processo entrou no sistema (`created_at`) não pode ser ajustada quando o usuário cadastra retroativamente.

## Correção

Ampliar o formulário de edição do Resumo para os seguintes campos:

**Novos campos editáveis (gravados em `capa_completa` mesclado):**
- Classe / Tipo da ação → `capa_completa.classifications[0].name`
- Assunto(s) → `capa_completa.subjects` (input separado por vírgulas, salva como array `[{ name }]`)
- Área do Direito → `capa_completa.area`
- Juiz responsável → `capa_completa.judge`
- Instância → `capa_completa.instance` (select: 1ª, 2ª, Superior)
- Estado (UF) → `capa_completa.state` (select com UFs)
- Cidade → `capa_completa.city`
- Justiça gratuita → `capa_completa.free_justice` (switch Sim/Não/Não informado)

**Nova coluna na tabela `processos_oab`:**
- `data_cadastro_sistema` (date, nullable) — quando preenchida, sobrescreve `created_at` na exibição. Mantém auditoria intacta sem permitir alteração do `created_at` real (que é usado em logs/ordenação interna).

**Datas existentes (já editáveis):**
- Data de Distribuição → mantida

**Outros campos sugeridos (incluídos por padrão, marque o que não quiser):**
- Observações internas → nova coluna `observacoes` (text) com Textarea — espaço livre para anotações da controladoria
- Valor da condenação → `capa_completa.condemnation_value`
- Valor das custas → novo campo em `capa_completa.court_costs`

Salvamento: `handleSalvarResumo` faz merge profundo em `capa_completa` (não sobrescreve cache do Escavador) + envia colunas próprias (`data_cadastro_sistema`, `observacoes`). Validação Zod com limites (texto ≤ 500, observações ≤ 5000).

Exibição (modo leitura): blocos atuais já mostram esses campos via `capa_completa`; passamos a priorizar overrides locais quando existirem.

## Arquivos afetados
- `supabase/migrations/...` — adicionar colunas `data_cadastro_sistema date` e `observacoes text` em `processos_oab`
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — expandir `formResumo`, inputs e `handleSalvarResumo` com merge em `capa_completa`
- `src/hooks/useAllProcessosOAB.ts` e `src/hooks/useOABs.ts` — aceitar novos campos no `atualizarProcesso`
- `src/types/` (se houver tipagem do ProcessoOAB) — adicionar campos opcionais

## Impacto

**Usuário final (UX/telas/fluxos):**
- Modo "Editar" do Resumo passa a ter ~8 novos campos agrupados nas seções existentes (Dados do Processo, Localização, Situação Atual)
- Novo bloco "Cadastro interno" com Data de cadastro no sistema + Observações
- Quem cadastra processo retroativamente pode fixar a data correta sem mexer em created_at
- Controladoria ganha campo livre de observações por processo

**Dados (migrations/RLS/performance):**
- Migration adiciona 2 colunas nullable em `processos_oab` (sem backfill, sem reescrita de tabela pesada)
- RLS existente já cobre — não precisa alterar políticas
- `capa_completa` recebe merge: cache do Escavador permanece intacto, overrides do usuário convivem com dados originais
- Sem impacto em índices ou queries existentes

**Riscos colaterais:**
- Edição manual de `capa_completa` pode ser sobrescrita se o processo for reimportado pelo Escavador. Mitigação: avisar via tooltip no modo Edição que campos da capa podem ser substituídos em reimports
- Mudança em `state`/UF não recalcula automaticamente sigla do tribunal (mantém-se independente — usuário deve ajustar manualmente se quiser)

**Quem é afetado:**
- Todos os tenants que usam Controladoria OAB
- Não afeta SuperAdmin (drawer próprio já tem sua estrutura)
- Não afeta processos CNPJ nem processos manuais antigos

## Validação
- Abrir um processo, clicar Editar, preencher todos os novos campos e salvar
- Recarregar drawer e confirmar persistência
- Testar com processo sigiloso (sem capa_completa) — campos devem aparecer vazios e aceitar input
- Verificar que reimport via "Reprocessar resumo" mantém data_cadastro_sistema e observacoes (colunas próprias) e sobrescreve apenas campos do capa_completa vindos do Escavador
