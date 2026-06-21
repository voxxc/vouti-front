## Causa raiz

- O importador manual por CNJ na aba OAB foi reescrito para chamar `judit-buscar-processo-cnj` / `judit-resetar-processo`.
- Você quer abandonar a Judit nesse fluxo. A consulta deve usar exclusivamente o Escavador (`escavador-importar-processo`), que já popula capa + andamentos.
- Persistem dois problemas a corrigir junto:
  1. Duplicidade tratava `escavador_id` sozinho como “capa completa”, bloqueando reconsulta de processos vazios (caso do `0123417-95.2025.8.16.0000`).
  2. A aba OAB lista `processos_oab`, mas o importador grava em `processos`, então o registro nunca aparece na tela.

## Correção

1. Reescrever `ImportarProcessoCNJDialog.tsx` para usar somente Escavador.
   - Remover qualquer chamada à Judit (`judit-buscar-processo-cnj`, `judit-resetar-processo`, credencial Judit).
   - Manter UX atual: campo CNJ, validação, toast de progresso, fechar dialog e recarregar lista.

2. Destino correto: `processos_oab`.
   - Procurar duplicidade por `oab_id + numero_cnj` em `processos_oab`.
   - Se não existir, inserir novo registro em `processos_oab` com `tenant_id`, `oab_id`, `numero_cnj`, `tribunal_sigla`, `importado_manualmente = true`, `importado_por = user.id`, e flags de apartado padrão.
   - Também garantir/criar registro espelho em `processos` (id usado pelo Escavador) vinculado por `numero_processo = numero_cnj` com `tenant_id` preenchido, para que o Escavador grave capa/andamentos no schema existente.

3. Regra de “capa completa” mais estrita.
   - Em `processo_monitoramento_escavador`, só considerar completo se houver `classe`, `tribunal`, `assunto` ou andamentos em `processo_atualizacoes_escavador`.
   - `escavador_id` sozinho NÃO conta como completo. Nesse caso, reconsultar.

4. Disparar `escavador-importar-processo`.
   - Após criar/reaproveitar o par `processos_oab` + `processos`, invocar a edge function passando `processoId` (do `processos`), `numeroProcesso`, `tenantId`, `ativarMonitoramento: false`.
   - Ao retornar com sucesso, atualizar `processos_oab` com flags úteis (`detalhes_carregados = true`, `tribunal`, `capa_completa`, etc., conforme colunas existentes) e chamar `onSuccess`/`fetchProcessos`.
   - Tratar erro do Escavador com toast claro, sem deixar o registro órfão invisível.

5. Corrigir o caso já quebrado.
   - Para `0123417-95.2025.8.16.0000`: vincular/criar em `processos_oab` para a OAB/tenant correto e atualizar o `processos` existente para receber `tenant_id` correto, sem apagar histórico. Reexecutar o fluxo Escavador para popular capa e andamentos.

## Arquivos afetados

- `src/components/Controladoria/ImportarProcessoCNJDialog.tsx` — reescrita do fluxo, removendo Judit e direcionando para Escavador + `processos_oab`.
- Possivelmente `src/hooks/useOABs.ts` ou hook equivalente — expor refetch/atualização de detalhe pós-import, se ainda não exposto.
- Banco: sem migration. Apenas correção pontual de dados do CNJ testado (UPDATE em `processos` para preencher `tenant_id` e INSERT em `processos_oab`).
- Edge functions: nenhuma alteração; reutiliza `escavador-importar-processo` como está.

## Impacto

1. Usuário final
   - Ao importar CNJ pela aba OAB, o processo aparece na lista da própria OAB.
   - Processos incompletos voltam a ser reconsultados em vez de “não acontece nada”.
   - Toast reflete estado real: importado, atualizado, já completo, erro.
   - Fluxo passa a ser 100% Escavador; nada mais depende de credencial Judit nesse import.

2. Dados
   - Novos imports geram registros consistentes em `processos_oab` (visíveis na aba) e em `processos` (alvo do Escavador), ambos com `tenant_id`.
   - Capa e andamentos seguem em `processo_monitoramento_escavador` e `processo_atualizacoes_escavador`.
   - Nenhuma migration, nenhuma mudança de RLS.

3. Riscos colaterais
   - Baixo, restrito ao botão “Importar Processo por CNJ” na aba OAB.
   - Cada reimport de processo incompleto consome créditos do Escavador.
   - `ImportarProcessoDialog.tsx` (busca OAB geral) permanece intocado.
   - Se algum outro ponto dependia do caminho Judit recém-introduzido, fica órfão; vou revisar referências antes de remover.

4. Quem é afetado
   - Usuários que importam CNJ manualmente pela aba OAB na Controladoria.
   - Admin/controladoria/advogados que visualizam processos por OAB.
   - Todos os tenants com isolamento reforçado por `tenant_id`.

## Validação

- Reimportar `0123417-95.2025.8.16.0000` pela aba OAB e confirmar:
  - Chamada a `escavador-importar-processo` aparece nos logs.
  - Capa e andamentos populados em `processo_monitoramento_escavador` / `processo_atualizacoes_escavador`.
  - Registro presente em `processos_oab` para a OAB/tenant atuais.
- Importar um CNJ novo (nunca visto) e confirmar criação completa nas três tabelas.
- Reimportar o mesmo CNJ e confirmar que não duplica e que o toast indica “já completo” quando aplicável.
- Confirmar que nenhuma chamada Judit é disparada nesse fluxo.
