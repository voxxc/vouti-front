
# Histórico de edições de prazos

A partir da implementação, toda edição em um prazo passa a registrar: campo alterado, valor anterior, valor novo, quem alterou e quando. Isso vale especialmente para a descrição — o texto antigo fica preservado mesmo após uma nova edição.

## Causa raiz

A tabela `deadlines` hoje sofre `UPDATE` destrutivo: só guarda o estado atual. Não existe `deadline_historico` nem trigger de auditoria, então alterações como a que ocorreu hoje no prazo "(FATAL 09/06) DEVEMOS APRESENTAR EXCEÇÃO..." são irrecuperáveis.

## Correção

1. **Nova tabela `deadline_historico`** (multi-tenant, com RLS por `tenant_id` + `has_role_in_tenant`):
   - `deadline_id`, `tenant_id`
   - `campo_alterado` (ex.: `title`, `description`, `due_date`, `status`, `priority`, `responsible_id`, `deadline_category`)
   - `valor_anterior` (text), `valor_novo` (text)
   - `alterado_por` (uuid → profiles), `alterado_em` (timestamptz)
   - Índice `(deadline_id, alterado_em DESC)`

2. **Trigger `AFTER UPDATE` em `deadlines`** comparando OLD/NEW dos campos relevantes. Insere uma linha por campo alterado, capturando `auth.uid()`. Bloco com `EXCEPTION WHEN OTHERS` para nunca bloquear o update original.

3. **Hook `useDeadlineHistorico(deadlineId)`** — busca paginada ordenada por data DESC, com join em `profiles` para exibir nome do autor.

4. **Aba "Histórico" no modal de detalhe do prazo** (ao lado de Comentários/Subtarefas):
   - Linha do tempo agrupada por edição (mesma data + autor)
   - Para `description` e `title`: exibe "Antes" e "Depois" em blocos colapsáveis com diff visual simples
   - Para campos curtos (status, prioridade, data): exibe "X → Y" em uma linha

## Arquivos afetados

- `supabase/migrations/<novo>.sql` — tabela, GRANTs, RLS, trigger e função
- `src/hooks/useDeadlineHistorico.ts` — novo hook
- `src/components/Deadlines/DeadlineHistorico.tsx` — nova aba
- Modal de detalhe do prazo existente — adicionar a aba (vou identificar o arquivo exato na implementação)

## Impacto

**Usuário final:** ganha nova aba "Histórico" nos prazos mostrando todas as edições com "de → para", autor e data. Para descrições longas, o texto anterior fica preservado integralmente. Nenhuma mudança em fluxos existentes.

**Dados:** nova tabela com crescimento proporcional ao volume de edições. Para tenants grandes, prever ~1 linha por edição × ~7 campos monitorados. Índice em `(deadline_id, alterado_em DESC)` mantém leitura rápida. RLS isola por tenant.

**Riscos colaterais:** trigger `AFTER UPDATE` com `EXCEPTION WHEN OTHERS` para não quebrar updates caso a tabela de histórico falhe. Captura de `auth.uid()` retorna NULL em updates feitos por Edge Functions com service_role — nesses casos o autor fica como "Sistema".

**Quem é afetado:** todos os tenants. Não há histórico retroativo — o registro começa a partir da migração. **A edição feita hoje no prazo da exceção de pré-executividade não é recuperável.**

## Validação

- Editar a descrição de um prazo de teste e conferir se aparece "Antes/Depois" na aba Histórico
- Alterar status, prioridade e data e conferir registros individuais por campo
- Confirmar isolamento entre tenants (usuário de outro tenant não vê o histórico)
- Confirmar que advogado/estagiário só vê histórico de prazos a que tem acesso (mesmas regras de RLS dos `deadlines`)
