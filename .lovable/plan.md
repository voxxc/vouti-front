# Filtros no Drawer de Movimentos Manuais (Super-Admin)

## Causa raiz
O `SuperAdminMovimentosManuaisDrawer` lista processos do tenant apenas com busca textual e abas Total/Atualizado. Não há paridade com a aba Geral da Controladoria (`GeralTab`), que oferece filtros por Monitorados, Sigilosos e UF.

## Correção

### 1. Edge function `super-admin-listar-processos-oab`
Estender o `select` para incluir os campos necessários à detecção de sigiloso e UF, sem mudar contrato existente:
- Adicionar `judit_data, partes_completas, capa_completa` ao `select` em `processos_oab`.
- Calcular um booleano `is_sigiloso` no servidor (mesma lógica de `isProcessoSigiloso` em `src/utils/processoOABHelpers.ts`: `secrecy_level >= 1`, `justice_secret === true`, partes mascaradas com regex de "sigilo/segredo de justiça", ou capa-cega) e devolver junto com o processo. Isso evita inflar payload com `judit_data` completo.
- Devolver também `uf` derivada (mesma lógica de `extrairUF` de `GeralTab.tsx`, baseada em `tribunal_sigla` + `numero_cnj`).
- Resultado: cada item passa a ter `{ ...campos atuais, is_sigiloso: boolean, uf: string }`.

### 2. Drawer `SuperAdminMovimentosManuaisDrawer.tsx`
- Adicionar `ProcessoLite.is_sigiloso` e `uf` ao tipo.
- Adicionar `useState filtro` (string) com valores: `todos`, `monitorados`, `nao_monitorados`, `sigilosos`, ou `uf:<UF>`.
- Calcular `globalCounts` client-side a partir de `processos`: total, monitorados, sigilosos, mapa de UFs com contagem.
- Renderizar um `<Select>` ao lado do campo de busca (estilo idêntico ao da `GeralTab`) com itens:
  - Todos (count)
  - Monitorados (count) — com ícone `Bell` verde
  - Não monitorados (count) — `BellOff`
  - Sigilosos (count) — `ShieldAlert` âmbar (oculto se 0)
  - Lista de UFs disponíveis com contagem
- Aplicar filtro em `filtrados` (combinado com a busca textual atual).
- Não incluir o filtro "Com novos andamentos" da Controladoria (depende de leitura por usuário, não se aplica ao super-admin).
- Não incluir filtro por OAB (o drawer já está no contexto de um único tenant; OABs ficam para refinamento futuro se necessário).

## Arquivos afetados
- `supabase/functions/super-admin-listar-processos-oab/index.ts` — incluir campos no select, calcular `is_sigiloso` e `uf` server-side.
- `src/components/SuperAdmin/SuperAdminMovimentosManuaisDrawer.tsx` — novo Select de filtros, estado, contagens e aplicação no `useMemo`.

Nenhuma migration ou alteração de RLS — só leitura adicional de colunas já existentes.

## Impacto
1. **Usuário final (super-admin):** ganha filtros rápidos no drawer de Movimentos Manuais — pode isolar processos sigilosos, monitorados/não monitorados ou por UF, igualando a UX da Controladoria. Busca textual continua funcionando combinada com o filtro.
2. **Dados:** sem migrations. O payload da edge function cresce ligeiramente (2 campos derivados por processo); `judit_data`/`partes_completas` são lidos no servidor mas não retornados, portanto sem impacto de banda no cliente. Performance equivalente — mesma query, só mais colunas no select.
3. **Riscos colaterais:** baixo. Se a heurística de sigiloso divergir entre cliente (Controladoria) e servidor (drawer), a contagem pode não bater. Mitigação: replicar a função `isProcessoSigiloso` fielmente na edge function.
4. **Quem é afetado:** apenas super-admins usando o drawer "Movimentos manuais". Nenhum outro tenant/usuário é tocado; a edge function só é chamada por super-admin.

## Validação
- Abrir o drawer em um tenant com processos sigilosos conhecidos → filtro "Sigilosos" deve mostrar contagem > 0 e listar apenas eles.
- Conferir que a contagem de Sigilosos no drawer é coerente com a aba Geral da Controladoria (mesmo tenant, ajustando para o universo do super-admin).
- Filtro por UF deve listar apenas processos cujo `tribunal_sigla`/CNJ resolvam para aquela UF.
- Busca textual + filtro selecionado devem operar em conjunto.
