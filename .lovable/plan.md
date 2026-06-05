## Causa raiz

A busca de processos por **CPF** existe num componente separado (`SuperAdminBuscaProcessosCPF`) e já tem um item no dropdown **Ferramentas** ("Busca CPF (Processos)"). Mas a busca por **Nome** (que existia antes) não está mais ativa em lugar nenhum. Você quer manter tudo **separado** da "Busca Geral" (cadastrais), porém com **um item próprio no dropdown** para acessar.

## Correção

1. **Estender** `SuperAdminBuscaProcessosCPF` para aceitar **CPF ou Nome**:
   - Adicionar um seletor "Tipo de busca" (CPF / Nome) no topo do componente.
   - Quando "Nome", o input deixa de mascarar CPF e mostra aviso de homônimos.
   - Renomear o componente/título para **"Busca de Processos por CPF ou Nome"**.

2. **Estender** a Edge Function `judit-buscar-processos-cpf` para aceitar opcionalmente `{ name: string }` além de `{ cpf }`, enviando à Judit `search_type: 'name'` quando vier nome. CPF continua funcionando exatamente igual.

3. **No dropdown "Ferramentas"** do Super Admin:
   - Renomear o item atual "Busca CPF (Processos)" para **"Busca Processos (CPF/Nome)"**.
   - Continua apontando para a mesma aba `busca-cpf-processos`.

Nada é mesclado com a "Busca Geral" (cadastrais) — ela continua intocada.

## Arquivos afetados

- `src/components/SuperAdmin/SuperAdminBuscaProcessosCPF.tsx` — adicionar Select de tipo (CPF/Nome), input adaptativo, payload condicional, aviso de homônimos.
- `src/pages/SuperAdmin.tsx` — renomear label do item no `DropdownMenu` Ferramentas.
- `supabase/functions/judit-buscar-processos-cpf/index.ts` — aceitar `name` no body, montar `search` correspondente.

Nenhuma migration / RLS.

## Impacto

1. **Usuário final (Super Admin):** volta a poder buscar processos por nome (além de CPF) num lugar dedicado, acessível por **um clique no dropdown Ferramentas → Busca Processos (CPF/Nome)**. A Busca Geral (cadastrais) permanece separada e idêntica.
2. **Dados:** sem mudança de schema, sem migrations, sem novas tabelas. A função apenas passa a aceitar mais um tipo de payload.
3. **Riscos colaterais:**
   - Busca por nome pode retornar muitos resultados / homônimos — mitigado por aviso visual e pela tabela já existente (mostra polos e tribunal).
   - Tempo de resposta da Judit por nome pode chegar a ~90s; o loader e mensagem já existem.
   - Compatibilidade preservada: chamadas antigas com `{ cpf }` continuam funcionando.
4. **Quem é afetado:** apenas **Super Admin**. Nenhum tenant, advogado, cliente ou módulo de CRM/Controladoria é tocado.

## Validação

- Abrir Super Admin → Ferramentas → "Busca Processos (CPF/Nome)".
- Selecionar **CPF**, digitar um CPF conhecido → tabela de processos aparece (igual hoje).
- Selecionar **Nome**, digitar um nome conhecido → tabela de processos aparece + alerta de homônimos.
- Confirmar que a aba **Busca Geral** continua mostrando apenas dados cadastrais (CPF/CNPJ/Nome) sem misturar processos.
