## Causa raiz
Os PDFs enviados ("Book 1 Unit 2" e "Book 1 Unit 3") seguem o mesmo formato da Unit 1 já cadastrada em **Book 1A** (Word Bank de frases + página estilo "notebook" com Straight to the Point, Easy to Understand / It's Time to Talk em `spn_straight_to_point.content_json`). Hoje só existe Unit 1 em Book 1A; o usuário quer que esse mesmo esquema seja replicado para essas duas novas unidades.

> Observação: existem Unit 2 e Unit 3 em **Book 1** (Subject Pronouns / Verb To Be) com outro conteúdo — não são essas. As novas unidades entram em **Book 1A**.

## Correção
Criar uma migration SQL que insere:

1. **Duas linhas em `spn_book_units`** (book_id = Book 1A `a0c11887-...`'s parent):
   - "Unit 2 — Snacks & Drinks" (sort_order 2)
   - "Unit 3 — Things I Own" (sort_order 3)
2. **Word Bank (`spn_word_bank_items`)** — 10 frases por unidade, mesmo formato da Unit 1 (campos `word`, `translation_pt`, `category='noun'`, `focus_word`, `sort_order`):
   - Unit 2: Peach pie, Pink lemonade, Butter cookies, Vegan yogurt, Coffee with milk, Soy milk, Bread and jam, Expensive whiskey, Onion rings, Vanilla milkshake.
   - Unit 3: My leather jacket, Your phone, The pretty dress, Collectible toys, A cheap shirt, Wireless headphones, Beach shorts, A red umbrella, A pair of jeans, The new video game console.
3. **Notebook page (`spn_straight_to_point` com `block_type='notebook_page'` e `content_json`)** — uma linha por unidade, replicando a estrutura JSON da Unit 1 (`sections → columns → rows` com `phrase`/`spacer`/`fill`):
   - Unit 2: bloco STP com pares "I like / I don't like" + "I want / I don't want" (chá verde, cookies, onion rings, milkshake) e blanks de prática; bloco Easy to Understand com cumprimentos (Good morning / afternoon / evening / night).
   - Unit 3: bloco STP com Yes/No questions ("Do you want to sell…", "Do you buy…") e blanks; bloco "It's Time to Talk" com pares de perguntas/respostas (drink/eat/sell/buy).

A migration faz tudo num único arquivo SQL e usa `INSERT ... ON CONFLICT DO NOTHING` quando possível para ser idempotente.

## Arquivos afetados
- `supabase/migrations/<timestamp>_spn_book1a_units_2_3.sql` (novo) — único arquivo.
- Nenhuma alteração em código React, edge functions, RLS ou grants (tabelas já existem com permissões corretas usadas pela Unit 1).

## Impacto
1. **UX**: Em Vouti.SPN → Books → Book 1A, alunos passam a ver Unit 2 e Unit 3 disponíveis com Word Bank e a página notebook (STP + Easy to Understand / It's Time to Talk) renderizada exatamente como na Unit 1.
2. **Dados**: 2 novas units, 20 novos word bank items, 2 novos `spn_straight_to_point` notebook_page. Nenhum dado existente é alterado.
3. **Riscos colaterais**: Mínimos — inserts isolados em tabelas já operacionais. Não toca em Unit 1 nem em Book 1.
4. **Quem é afetado**: Apenas usuários SPN que abrirem Book 1A.

## Validação
- Após a migration, abrir Book 1A e confirmar que aparecem Unit 1, Unit 2 e Unit 3.
- Abrir cada unidade nova: Word Bank com 10 itens; bloco notebook renderiza Straight to the Point com cores/bolds corretos e os campos "fill" funcionais; segundo bloco (Easy to Understand na Unit 2, It's Time to Talk na Unit 3) aparece logo abaixo.
- Conferir no DB: `SELECT count(*) FROM spn_word_bank_items WHERE unit_id IN (<u2>,<u3>)` retorna 20.
