## Causa raiz

O módulo SPN já tem a base (`spn_books`, `spn_units`, `spn_sections`, `spn_word_bank_items`, `spn_straight_to_point`, `spn_progress`, etc.) e o `SectionViewer` já roteia por `section.type` (word_bank, grammar, quiz, glossary…). Faltam:

1. Conteúdo: Book 1 / Unit 1 não está populado com as 3 páginas dos prints.
2. Dois tipos de seção interativos que ainda não existem: **Easy to Understand** (pares de frases-modelo + linha do aluno) e **Exercises** (banco genérico de exercícios para completar).
3. Tabelas para persistir as respostas do aluno desses dois novos tipos.

## Correção

### 1. Banco de dados (migration)

Criar 4 tabelas novas, com RLS e GRANTs:

- `spn_easy_to_understand_items` — `unit_id`, `pair_index` (agrupa esquerda/direita), `side` (`left`|`right`), `prompt_html` (frase-modelo em negrito tipo "Hello. / Hi."), `placeholder` (frase pequena ex.: "How are you?"), `sort_order`.  
  Leitura: aluno autenticado. Escrita: admin/professor.
- `spn_easy_to_understand_answers` — `item_id`, `user_id`, `answer`. Único por (item_id,user_id). Aluno só vê/edita as próprias.
- `spn_exercises` — `unit_id`, `kind` (`fill_blank`|`short_answer`|`translate`), `prompt_html` (com `___` marcando a lacuna), `correct_answer` (opcional, texto), `hint` (opcional), `sort_order`. Leitura aluno, escrita admin.
- `spn_exercise_answers` — `exercise_id`, `user_id`, `answer`, `is_correct` (calculado se houver `correct_answer`). Único por (exercise_id,user_id).

Sem alterações destrutivas em tabelas existentes; só novas. Não há `tenant_id` no SPN (módulo standalone), seguindo o padrão das tabelas `spn_*` já existentes (RLS por `user_id` ou role).

### 2. Frontend

- **Novos viewers** em `src/components/Spn/`:
  - `EasyToUnderstandView.tsx` — renderiza grid 2 colunas (left/right por `pair_index`), cada item mostra `prompt_html` em destaque + linha (`Input` com underline) que salva no `onBlur` em `spn_easy_to_understand_answers`. Mesmo padrão do `WordBankStudentView`.
  - `ExercisesView.tsx` — lista de cards; cada exercício mostra `prompt_html` com a lacuna substituída por um `Input` inline; salva no `onBlur`; se `correct_answer` existir, mostra ✓/✗ ao desfocar.
- **`SectionViewer.tsx`**: adicionar `easy_to_understand` e `exercises` ao `sectionIcons` e ao roteamento (`if (section.type === 'easy_to_understand') return <EasyToUnderstandView unitId={unitId} />` etc.). Para esses tipos, o botão "Mark as Complete" continua disponível (igual ao Word Bank atual).
- **`AdminBooksManager.tsx`**: incluir os dois novos tipos no `Select` de tipo de seção quando o professor criar manualmente (mudança pequena no dropdown — sem refator).

### 3. Conteúdo da Unit 1 (seed via insert tool, não migration)

Garantir 1 row em `spn_books` (Book 1) e 1 em `spn_units` (Unit 1) e popular:

- **Section 1 — Word Bank** (`word_bank`): 12 itens em `spn_word_bank_items` exatamente como o print  
  (Red meat, Cheese pizza, Tomato salad, Chocolate cake, Rice and beans, Hot French fries, Cold water, Apple juice, Sweet wine, A bottle of beer, A cup of coffee, A glass of soda).
- **Section 2 — Straight to the Point** (`straight_to_point`): 1 bloco "Simple Present" em `spn_straight_to_point` com o HTML dos exemplos `I drink cold water. / I don't drink cold water. / I drink a cup of coffee. And you? / I drink a cup of coffee too. / I drink ____. And you?` (e o par com `eat`).
- **Section 3 — Easy to Understand** (`easy_to_understand`): 4 pares em `spn_easy_to_understand_items`:  
  L: "Hello. / Hi." · R: "Bye. / See you."  
  L: "How are you?" · R: "I'm great, and you?"
- **Section 4 — Exercises** (`exercises`): 6–8 itens em `spn_exercises` combinando vocabulário + Simple Present, por exemplo:  
  - "I ___ cold water every morning." (drink)  
  - "She ___ chocolate cake on Sundays." (eats)  
  - "We don't ___ rice and beans for breakfast." (eat)  
  - Tradução curta: "A cup of coffee" → ___ (deixar `correct_answer` opcional).

A seção `Reading/Culture` (Louisiana) **fica fora deste MVP** conforme escolha "Word Bank / Easy to Understand / Straight to the Point / Exercises".

## Arquivos afetados

- `supabase/migrations/<novo>.sql` — cria as 4 tabelas + RLS + GRANTs.
- Insert tool — popula `spn_books`/`spn_units`/`spn_sections` + itens das 4 seções.
- `src/components/Spn/EasyToUnderstandView.tsx` (novo).
- `src/components/Spn/ExercisesView.tsx` (novo).
- `src/components/Spn/SectionViewer.tsx` — roteamento dos novos tipos.
- `src/components/Spn/AdminBooksManager.tsx` — adiciona os tipos no dropdown.
- `src/integrations/supabase/types.ts` — regenerado automaticamente após a migration.

## Impacto

1. **Usuário final (aluno)**: ao abrir Sidebar → Books → Book 1 → Unit 1, encontra 4 seções clicáveis. Cada uma renderiza UI interativa (campos de input que salvam sozinhos), com botão "Mark as Complete" que dá +20 pontos e atualiza streak — igual ao fluxo atual de Word Bank. Mobile-friendly (mesmo padrão `Card` já usado).
2. **Usuário final (professor/admin)**: no AdminBooksManager passa a poder criar seções dos dois novos tipos; a edição de itens em si (Easy/Exercises) pode ser feita inicialmente via SQL — UI de edição visual fica para iteração seguinte (avise-me se quiser já incluir).
3. **Dados**: +4 tabelas pequenas no schema `public`. Nenhuma tabela existente é alterada. RLS escopa por `user_id` (respostas) e role de professor (conteúdo). Performance trivial (volumes baixos). Sem impacto em multi-tenant (SPN é standalone — não usa `tenant_id`).
4. **Riscos colaterais**: baixos. O `SectionViewer` cai num fallback genérico se um tipo novo chegar sem viewer, então mesmo sem deploy do front a navegação não quebra. Cuidado único: garantir que o ícone `sectionIcons` tenha entrada para os novos tipos (senão usa `BookOpen` default — aceitável).
5. **Quem é afetado**: apenas usuários do SPN (alunos e professores). Nenhum impacto nos módulos CRM/Jurídico/WhatsApp.

## Validação

1. Migration roda sem erro; `\d` mostra as 4 tabelas com RLS habilitado e GRANTs corretos.
2. Logar como aluno → Sidebar → Books → Book 1 → Unit 1 mostra 4 seções na ordem certa.
3. Word Bank: digitar tradução, recarregar, valor persiste.
4. Straight to the Point: mostra bloco "Simple Present" formatado.
5. Easy to Understand: 2 colunas, 4 pares, escrever e recarregar mantém a resposta.
6. Exercises: preencher lacuna, ver feedback ✓/✗ quando há `correct_answer`, persistência ok.
7. Botão "Mark as Complete" em qualquer seção credita +20 pts e atualiza streak.
8. Confirmar isolamento RLS: outro user não vê respostas do primeiro (`spn_*_answers`/`spn_word_translations`).
