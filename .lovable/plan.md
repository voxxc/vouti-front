## Causa raiz

O badge "TJPR" ao lado do número do processo vem de `proc.tribunal_sigla` (derivado do CNJ) e é só leitura. Não existe forma de marcar manualmente "EPROC", "PROJUDI", "PJe", etc.

## Correção

1. **Catálogo de sistemas (criado/editado pelo próprio super-admin, inline)**
   - Nova tabela `super_admin_sistemas_processo` (`id`, `slug`, `nome`, `cor`, `created_by`, `created_at`) com RLS restrita a super_admins.
   - Sem dialog separado de "gerenciar". Toda a CRUD acontece no mesmo Popover do badge.

2. **Override por processo**
   - Adicionar coluna `sistema_tag text` em `processos_oab` (slug do catálogo, nullable).
   - Estender a edge function de meta já usada por `atualizarMeta` no painel para aceitar `sistema_tag`. Incluir `sistema_tag` no SELECT de `super-admin-processo-oab-detalhes`.

3. **UI: badge clicável com CRUD embutido**
   - Substituir o `<Badge>{proc.tribunal_sigla}</Badge>` por um botão-badge clicável que abre um Popover:
     - Mostra `sistema_tag` (nome + cor do catálogo) se houver; senão `tribunal_sigla`; senão "Definir sistema".
     - **Lista** dos sistemas cadastrados — clique aplica ao processo (`atualizarMeta({ sistema_tag: slug })`).
     - **Cada item** tem hover com ícones lápis/lixeira para editar nome+cor ou excluir (inline, sem sair do popover).
     - **Linha "+ Novo sistema"** no rodapé: abre um mini-form inline (input de nome + color picker + botão "Criar") que adiciona ao catálogo e já aplica ao processo.
     - Opção "Remover do processo" quando há override.
   - Edge functions de catálogo: `super-admin-listar-sistemas-processo` e `super-admin-gerenciar-sistema-processo` (ações `criar` / `editar` / `excluir`), espelhando as existentes de `tribunais_andamento`.

## Arquivos afetados

- Migration: tabela `super_admin_sistemas_processo` (+ GRANTs + RLS) + coluna `processos_oab.sistema_tag`.
- `supabase/functions/super-admin-listar-sistemas-processo/index.ts` (novo).
- `supabase/functions/super-admin-gerenciar-sistema-processo/index.ts` (novo).
- `supabase/functions/super-admin-atualizar-processo-oab-meta` (ou função equivalente já chamada por `atualizarMeta`): aceitar `sistema_tag`.
- `supabase/functions/super-admin-processo-oab-detalhes/index.ts`: incluir `sistema_tag`.
- `src/components/SuperAdmin/SuperAdminProcessoOABDetalhesPanel.tsx`: trocar badge fixo por Popover com lista + edit/delete inline + form "novo sistema".

## Impacto

- **Usuário final (super-admin):** o badge passa a ser clicável. Em um único Popover dá pra escolher um sistema existente, criar um novo, editar nome/cor ou excluir — tudo sem sair do painel do processo. Quando nada está definido, segue mostrando a sigla automática (mudança invisível para processos não-editados).
- **Dados:** nova tabela pequena + nova coluna nullable em `processos_oab` (sem backfill, sem migrar dados antigos). RLS exige `super_admins`. Sem impacto perceptível de performance.
- **Riscos colaterais:** baixos. Excluir um sistema do catálogo deixa processos que o usavam com `sistema_tag` "órfão" — o painel passa a exibir o fallback (`tribunal_sigla`) automaticamente, sem erro. Mudanças nas edge functions são aditivas (campo opcional).
- **Quem é afetado:** apenas super-admins. Tenants e advogados não veem mudança nenhuma — o badge e o catálogo vivem só no painel super-admin.

## Validação

1. Migration aplica; `select * from super_admin_sistemas_processo` retorna vazio (sem seed — usuário cria).
2. Abrir um processo OAB no `/super-admin`: badge clicável; popover abre vazio com "+ Novo sistema".
3. Criar "EPROC" com cor → aparece na lista e é aplicado ao processo; badge muda imediatamente.
4. Reabrir o painel: badge persistido. Editar cor → reflete na hora. Excluir o sistema → badge volta à sigla automática.
5. Conferir nos logs da edge function de meta que `sistema_tag` é gravado em `processos_oab.sistema_tag`.
