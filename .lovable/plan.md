## Causa raiz

1. **Exercises sem feedback pedagógico**: hoje só registra resposta; aluno não vê o gabarito, não entende o erro, não recebe explicação. Não há corretor consolidado nem "aprendizado do dia".
2. **Straight to the Point ainda genérico**: blocos de regra + Q/A− /A+ não impõem estrutura curricular. Cada unit pode ter qualquer coisa, sem garantia de 2 verbos novos, sem question word, sem phrasal verb, sem expressão. Visual é texto centralizado, não parece conversa real.
3. **Word Bank não tem taxonomia**: tudo é tratado igual, não dá pra exigir "2 verbos novos por unit" nem destacar question words/phrasal verbs/expressões na UI.
4. **Não existe prática guiada inline**: aluno lê o exemplo pronto mas não tem onde aplicar a palavra nova imediatamente, dentro do próprio STP.

---

## Correção

### 1. Word Bank — nova taxonomia por categoria
Adicionar coluna `category` em `spn_word_bank_items` com enum:
- `verb` (alvo: 2 por unit, marcados como `is_featured_verb=true`)
- `question_word` (what, where, when, why, how, who — 1 por unit recomendado)
- `phrasal_verb` (get up, look for…)
- `expression` (idioms / chunks)
- `noun` / `adjective` / `adverb` / `other` (palavras de apoio)

Admin ganha seletor de categoria + toggle "Verbo destaque desta unit" (com validação: máx 2 por unit).
Word Bank do aluno passa a agrupar por categoria com chips coloridos (Verbos / Question Word / Phrasal Verb / Expressão / Vocabulário).

### 2. Straight to the Point — formato chat + fill-in
Estender `spn_straight_to_point` com novo `block_type = 'chat_dialogue'` (mantém compat com `dialogue` e `html` antigos) e campos:
- `chat_title` (ex: "No restaurante")
- `chat_situation` (1 frase de contexto)
- `chat_messages` (jsonb array): `[{ speaker: 'A'|'B', en, pt, highlight_words: ['eat','at'] }]`
- `target_words` (jsonb array): lista das palavras novas usadas no diálogo, referenciando `spn_word_bank_items.id` quando possível
- `fill_in_practice` (jsonb array): `[{ sentence_template: "I ___ pizza every day.", correct_answer: 'eat', options: ['eat','eats','eating'], hint_pt: "use o verbo na 1ª pessoa" }]` — 2 a 4 frases logo abaixo do diálogo

Visual no aluno (`StraightToPointView`):
- Header com `chat_title` + `chat_situation`
- Balões alternados esquerda/direita (estilo WhatsApp), foto/avatar A e B, TTS por balão
- Palavras em `highlight_words` ficam sublinhadas + tooltip com tradução
- Bloco "Sua vez" com cards de completar (input ou botões de opção), validação inline (verde/vermelho + tradução completa após acerto)

### 3. Exercises — validação híbrida + aprendizado
Estender `spn_exercises` com:
- `correct_answer` (texto/jsonb conforme tipo)
- `explanation_pt` (texto curto explicando POR QUE é aquela resposta)
- `learning_tip_pt` (1 linha de "aprendizado")

Componente `ExercisesView`:
- **Modo prática (imediato)**: cada item tem botão "Verificar" → mostra ✓/✗ + resposta correta + `explanation_pt`. Botão "Ver resposta" disponível sem penalidade (marca como "vi resposta", não conta acerto).
- **Modo prova (final)**: aluno responde todos, clica "Corrigir tudo" → pontuação X/Y, lista de revisão com cada erro destacado e `explanation_pt`.
- **Aprendizado do dia**: card no topo após corrigir, agregando `learning_tip_pt` dos itens errados (ou os 3 mais importantes da unit).
- **Filtros**: chips no topo — Todos / Não respondidos / Errados / Acertados / Vi resposta. Persiste estado da sessão via `spn_exercise_answers`.

### 4. Estrutura obrigatória da Unit (validação no admin)
Painel admin de cada unit mostra checklist visual:
- [ ] 2 verbos novos cadastrados (Word Bank `category=verb` + `is_featured_verb=true`)
- [ ] 1 question word (opcional mas sugerido)
- [ ] 1 phrasal verb (opcional)
- [ ] 1 expressão (opcional)
- [ ] Pelo menos 1 bloco Straight to the Point usando os 2 verbos novos

Sem bloquear save, mas com aviso "Unit incompleta".

---

## Arquivos afetados

**Migrations (Supabase):**
- `spn_word_bank_items`: add `category text default 'other'`, `is_featured_verb boolean default false`; trigger valida máx 2 verbos destaque por unit.
- `spn_straight_to_point`: add `chat_title`, `chat_situation`, `chat_messages jsonb`, `target_words jsonb`, `fill_in_practice jsonb`; expande check de `block_type` para incluir `'chat_dialogue'`.
- `spn_exercises`: add `correct_answer jsonb`, `explanation_pt text`, `learning_tip_pt text`.
- `spn_exercise_answers`: add `viewed_answer boolean default false`, `is_correct boolean`.

**Frontend:**
- `src/components/Spn/StraightToPointView.tsx` — renderer para novo block_type
- `src/components/Spn/StraightToPointChatBlock.tsx` (novo) — balões + TTS + highlight + fill-in inline
- `src/components/Spn/AdminBooksManager.tsx` — editor de chat (lista de mensagens A/B), editor de fill-in, seletor de categoria + toggle verbo destaque, checklist da unit
- `src/components/Spn/ExercisesView.tsx` — modos prática/prova, filtros, ver resposta, card de aprendizado
- `src/components/Spn/WordBankStudentView.tsx` — agrupamento por categoria com chips
- `src/integrations/supabase/types.ts` — regenerado pós-migration

---

## Impacto

**1. UX do aluno final**
- STP vira experiência tipo chat (WhatsApp), com áudio em cada balão, palavras destacadas e prática imediata logo abaixo. Muito mais engajante.
- Exercises passam a ensinar, não só testar: aluno entende por que errou, recebe dica e pode revisar.
- Word Bank fica organizado por categoria — fica claro "esses são os verbos da aula", "essa é a expressão".

**2. Dados**
- 4 migrations aditivas (sem breaking): novas colunas com defaults, blocos antigos continuam renderizando.
- Trigger leve no Word Bank (máx 2 verbos destaque/unit) — custo desprezível.
- `spn_exercise_answers` ganha estado mais rico; queries existentes continuam funcionando.
- Nenhuma mudança em RLS — herdadas das tabelas existentes.

**3. Riscos colaterais**
- Conteúdo já cadastrado em blocos `html`/`dialogue` continua exibindo, mas ficará "antigo" visualmente até ser migrado para `chat_dialogue` manualmente.
- Admin precisa reaprender o editor de STP (mais campos) — mitigado com tabs "Chat (novo)" vs "Legado".
- `correct_answer` em exercícios antigos virá NULL → modo "ver resposta" desabilitado nesses itens (com aviso "Resposta não cadastrada").

**4. Quem é afetado**
- **Alunos SPN** (todos os tenants/books): ganham nova UX em STP e Exercises.
- **Admin SPN**: precisa preencher os novos campos (correct_answer, explanation_pt) para novos exercícios; antigos seguem funcionando em modo degradado.
- **Outros módulos** (CRM, Legal, Veridicto): zero impacto — mudanças isoladas em tabelas `spn_*`.

---

## Validação

1. Após migration, abrir Unit 3 no admin → criar bloco `chat_dialogue` com 6 mensagens A/B + 3 fill-ins + marcar 2 verbos como destaque.
2. Abrir como aluno → conferir balões alternados, TTS por balão, highlight nas palavras-alvo, fill-in valida certo/errado inline.
3. Criar exercício com `correct_answer` e `explanation_pt` → testar modo prática (verificar item a item), modo prova (corrigir tudo), filtro "errados", botão "ver resposta".
4. Word Bank do aluno: confirmar agrupamento por categoria com chips.
5. Checklist da unit no admin: cadastrar só 1 verbo destaque → ver aviso "Faltam 1 verbo"; cadastrar 3 → trigger bloqueia.
6. Verificar que blocos STP antigos (`html`, `dialogue`) continuam renderizando sem erro.
