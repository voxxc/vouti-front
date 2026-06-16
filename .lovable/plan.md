# Plano — Repaginação da Vouti.SPN

## Causa raiz
- **Word Bank repetindo entre units**: hoje não há validação de duplicidade — o mesmo termo é cadastrado em múltiplas units do mesmo book. Cada unit deveria trazer palavras novas, e os exercícios deveriam reciclar termos de units anteriores em vez de repetir os da mesma lista.
- **Straight to the Point genérico**: o modelo atual (`spn_straight_to_point`) é só `title + content_html`, sem estrutura para diálogo/regra. Não força foco em conversação nem em aplicação da regra gramatical da unit (He/She/It → verbo com -s, Do/Does, etc.).
- **Conteúdo escasso**: poucas units possuem material; falta um seed inicial coerente (Verb To Be, Pronouns, He/She/It + verbos comuns, Do/Does + Like/Eat).

## Correção

### 1. Word Bank único por book (anti-duplicata)
- **Migration**: criar índice único `UNIQUE (book_id, lower(trim(word)))` em `spn_word_bank_items` (via `spn_book_units`). Como hoje a tabela liga a `unit_id`, derivar `book_id` por trigger ou criar `book_id` denormalizado preenchido por trigger. Estratégia: adicionar coluna `book_id uuid` em `spn_word_bank_items` (preenchida via trigger a partir de `unit_id → spn_book_units → book_id`) e criar índice único `(book_id, lower(word))`.
- **Limpeza pré-índice**: script SQL identifica duplicatas (mesma palavra, mesmo book) e mantém a mais antiga; remove as demais (registro em log).
- **Admin UI** (`AdminWordBankManager` / form de criação): antes de inserir, consultar se a palavra já existe no book; bloquear com mensagem clara ("Palavra já existe na Unit X deste book").
- **Exercícios variando vocabulário**: ao gerar/exibir exercícios de uma unit, hook puxa pool = palavras desta unit + amostra das units anteriores do mesmo book (sort_order menor). Garante revisão contínua sem repetir as mesmas da unit.

### 2. Straight to the Point conversacional
Refatorar o modelo para suportar **Regra → Diálogo → Exemplos**.

- **Migration**:
  - Adicionar em `spn_straight_to_point`: `block_type text` ('rule_dialogue' | 'legacy_html'), `rule_title text`, `rule_explanation text`, `question_text text`, `answer_negative text`, `answer_positive text`, `examples jsonb` (array `{ text, translation }`).
  - Manter `content_html` para retrocompatibilidade (`block_type='legacy_html'`).
- **Componente novo** `StraightToPointDialogueBlock.tsx`:
  - Cabeçalho: regra (ex: "He / She / It → verb + s") + explicação curta.
  - Bloco diálogo (com botão play TTS por linha via `spnSpeech`):
    - Q: "Does she like coffee?"
    - A−: "No, she doesn't like coffee."
    - A+: "Yes, she likes coffee."
  - Exemplos: lista numerada com tradução opcional ao tocar.
- **`StraightToPointView.tsx`**: detecta `block_type` e renderiza `StraightToPointDialogueBlock` (novo) ou bloco HTML antigo.
- **Admin** (`AdminStraightToPointManager` — criar se não existir, ou estender o atual): formulário com campos do diálogo + repeater de exemplos.

### 3. Popular conteúdo inicial (seed)
Inserir via `supabase--insert` (não migration) em pelo menos as primeiras units do Book A1:
- **Unit 1 — Verb To Be (I am / You are)**: word bank 12 palavras novas; Straight to the Point com 3 blocos (afirmativo, negativo, interrogativo) cada um com Q/A−/A+ + 4 exemplos.
- **Unit 2 — Pronouns + He/She/It is**: 12 palavras novas (não repetir Unit 1); 3 blocos focando 3ª pessoa.
- **Unit 3 — Present Simple (I/You/We/They) com Like, Eat, Drink, Work**: 14 palavras novas (verbos + comida/bebida); blocos com Do + Q/A−/A+.
- **Unit 4 — Present Simple 3ª pessoa (He/She/It + verb-s)**: 12 palavras novas; blocos com Does + Q/A−/A+ + regra de adição de -s/-es.
- Exercícios de cada unit puxam pool = palavras da unit + sample de unidades anteriores.

## Arquivos afetados

**Novos**
- `src/components/Spn/StraightToPointDialogueBlock.tsx`
- `src/components/Spn/AdminStraightToPointManager.tsx` (admin para criar blocos diálogo)
- `supabase/migrations/<timestamp>_spn_word_bank_unique_and_dialogue.sql`

**Editados**
- `src/components/Spn/StraightToPointView.tsx` — render condicional por `block_type`.
- `src/components/Spn/AdminWordBankManager.tsx` (ou equivalente) — validação anti-duplicata + mensagem.
- Hook/componente de exercícios de word bank (ex: `WordBankStudentView`, `spnAnswerValidator` se necessário) — pool ampliado com units anteriores.
- `src/pages/SpnDashboard.tsx` — rota/entrada para `AdminStraightToPointManager` no menu admin.

**Não tocar**
- `src/integrations/supabase/types.ts` (regenerado automaticamente).

## Impacto

**1. UX / telas / fluxos**
- Aluno: Straight to the Point passa a mostrar diálogo Q/A−/A+ com play de áudio, regra destacada e exemplos — muito mais conversacional. Exercícios variam vocabulário entre units (revisão natural).
- Admin: novo formulário de bloco diálogo (mais campos que antes). Tentar cadastrar palavra duplicada no book mostra erro claro.

**2. Dados / migrations / RLS / performance**
- Migration adiciona coluna `book_id` em `spn_word_bank_items` + trigger de preenchimento + índice único `(book_id, lower(word))`. RLS atual permanece.
- Migration adiciona 6 colunas em `spn_straight_to_point` (nullable) + check no `block_type`. Sem impacto em RLS.
- Pré-limpeza de duplicatas é destrutiva (remove linhas) — log antes/depois para auditoria.
- Seed insere ~50 word bank items + ~12 blocos straight-to-point — volume desprezível.

**3. Riscos colaterais**
- Conteúdo legado de Straight to the Point continua funcionando (`block_type='legacy_html'`), mas se o admin quiser converter para diálogo precisa recriar.
- Se já existirem palavras duplicadas que sejam relevantes em units distintas, perderemos as cópias — mitigado pelo log e pela política "palavra aparece uma vez por book, reaproveitada como revisão nos exercícios das próximas".
- Aluno em meio a um exercício pode estranhar termos de units anteriores no quiz — comportamento intencional (revisão).

**4. Quem é afetado**
- Todos os alunos SPN (novo visual do Straight to the Point + variação de vocabulário).
- Admins SPN (novo formulário, validação anti-duplicata).
- Teachers (sem mudança operacional).
- Nenhum outro produto Vouti afetado (escopo isolado em `spn_*`).

## Validação
1. Migration roda sem erro; índice único bloqueia duplicata em teste manual.
2. Tentar cadastrar palavra repetida no mesmo book pelo admin → toast de erro.
3. Abrir Unit 4 como aluno → Straight to the Point exibe Regra + Q/A−/A+ + Exemplos com áudio funcionando.
4. Exercício da Unit 3 inclui pelo menos 2 palavras das Units 1–2.
5. Bloco legado antigo continua renderizando (regressão).
6. Build + checagem de tipos limpos.
