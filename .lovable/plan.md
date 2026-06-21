## Causa raiz

- Toast vermelho: `new row for relation "processos_oab" violates check constraint "processos_oab_api_provider_check"`.
- A constraint atual aceita apenas `judit` ou `codilo`:
  `CHECK (api_provider = ANY (ARRAY['judit','codilo']))`.
- O novo importador grava `api_provider = 'escavador'`, o que viola a constraint e aborta o INSERT.

## Correção

Opção A (preferida): expandir a constraint para incluir `'escavador'`.
- Migration:
  - `ALTER TABLE public.processos_oab DROP CONSTRAINT processos_oab_api_provider_check;`
  - `ALTER TABLE public.processos_oab ADD CONSTRAINT processos_oab_api_provider_check CHECK (api_provider = ANY (ARRAY['judit','codilo','escavador']));`
- Mantém `api_provider = 'escavador'` no insert do dialog para diferenciar a origem.

Opção B: não alterar a constraint e gravar `api_provider = 'judit'` no insert mesmo usando Escavador.
- Não recomendado: confunde rastreabilidade e quebra qualquer filtro que dependa de `api_provider`.

Vou seguir a opção A.

## Arquivos afetados

- Migration nova alterando a constraint `processos_oab_api_provider_check`.
- `src/components/Controladoria/ImportarProcessoCNJDialog.tsx` — sem mudanças (já grava `'escavador'`).

## Impacto

1. Usuário final
   - O import por CNJ na aba OAB volta a funcionar; o processo `0123417-95.2025.8.16.0000` será inserido em `processos_oab` e a chamada ao Escavador será disparada.
   - Sem mudança visual.

2. Dados
   - Constraint passa a aceitar `escavador` além de `judit` e `codilo`.
   - Sem alteração em RLS, sem migração de dados, sem perda.

3. Riscos colaterais
   - Mínimos: apenas amplia o conjunto de valores válidos. Linhas existentes continuam válidas.
   - Filtros/relatórios que listam por `api_provider` agora podem ver linhas `escavador`.

4. Quem é afetado
   - Usuários que importam CNJ pela aba OAB.
   - Admin/controladoria que filtra por provider em relatórios.

## Validação

- Rodar a migration.
- Reimportar `0123417-95.2025.8.16.0000` pela aba OAB.
- Confirmar:
  - Sem toast de erro de check constraint.
  - Linha aparece em `processos_oab` para o `oab_id` atual com `api_provider='escavador'`.
  - Chamada `escavador-importar-processo` aparece nos logs.
  - Capa/andamentos populados em `processo_monitoramento_escavador` / `processo_atualizacoes_escavador`.
