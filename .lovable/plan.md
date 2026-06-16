# Book 1 padrão + Visual gamificado + Practice (Multiple Choice)

## Causa raiz
Hoje o SPN tem a infraestrutura de Books/Units/Word Bank/STP/Easy/Exercises, mas:
- Nenhum Book 1 oficial está populado (admin precisa criar tudo manualmente).
- Visual do aluno é funcional, sem o "wow" gamificado que você quer.
- Não existe modo "jogo" — só exercícios texto-resposta, sem alternativas, sem dificuldade progressiva, sem volume.

## Correção

### 1. Conteúdo: Book 1 oficial (12 units, ordem progressiva)
Sequência didática começando do zero, conforme você pediu (Do/Does, pronomes, verbos simples, palavras comuns, greetings):

```
Unit 1  — Greetings & Introductions (hello, hi, my name is, nice to meet you, goodbye)
Unit 2  — Subject Pronouns (I, you, he, she, it, we, they)
Unit 3  — Verb To Be (am, is, are — affirmativo, negativo, perguntas)
Unit 4  — Common Verbs I (eat, drink, want, like, play, go, have)
Unit 5  — Articles & Common Nouns (a, an, the + food, drinks, objects do dia a dia)
Unit 6  — Possessives (my, your, his, her, our, their)
Unit 7  — Present Simple + Do/Does (afirmativo, negativo, Yes/No questions)
Unit 8  — WH-Questions (what, where, when, who, why, how)
Unit 9  — Prepositions & Connectors (with, in, on, at, and, but)
Unit 10 — Numbers, Days & Time (1–100, days of week, telling time)
Unit 11 — Family & People (mother, father, friend, etc.)
Unit 12 — Likes & Dislikes (I like / I don't like / Do you like…?)
```

Cada Unit é populada com:
- **Word Bank**: 15–20 palavras-chave com phonetic e tradução-base (pt-BR).
- **Straight to the Point**: 2–3 cards de gramática em HTML enxuto.
- **Easy to Understand**: 5–8 pares de diálogo EN↔PT.
- **Exercises** (texto): 6–10 itens (fill_blank / short_answer / translate).

Tudo via migration SQL única que faz `INSERT … ON CONFLICT DO NOTHING` em `spn_books`, `spn_book_units`, `spn_word_bank_items`, `spn_straight_to_point`, `spn_easy_to_understand_items`, `spn_exercises` (idempotente — pode rodar sem duplicar).

### 2. Visual gamificado vibrante (área do aluno)
Aplicado em `BooksView`, `WordBankStudentView`, `ExercisesView`, `StudentDashboard`:
- Tokens novos em `index.css` (escopo `.spn-student`): gradientes vibrantes, glow, sombra colorida — sem mexer em tokens globais.
- **Cards de Book/Unit**: border-beam animado no hover, gradiente no cover, badge de XP, micro-bounce ao tocar.
- **Word Bank**: cards com shimmer ao revelar tradução, pequeno "sparkle" SVG.
- **Exercises**: feedback de acerto com burst de confete (`canvas-confetti` — leve, ~6kb), shake suave no erro, barra de progresso animada.
- **Dashboard do aluno**: header com gradient + particles sutis de fundo, contadores animados (XP, streak), pulse no streak.
- Animações já disponíveis no Tailwind (`fade-in`, `scale-in`, `hover-scale`) + 2–3 keyframes novas (`shimmer`, `sparkle`, `glow-pulse`).

### 3. Novo módulo: **Practice** (Multiple Choice)
Hub independente acessível pela sidebar/mobile-nav do aluno: **"🎮 Practice"**.

**Fluxo do aluno:**
1. Escolhe **nível de dificuldade**: Easy (4 alternativas curtas, sem tempo) · Medium (4 alternativas, 15s/questão) · Hard (4 alternativas, 8s/questão + distratores parecidos).
2. Escolhe **escopo**: Todas as units já liberadas / Uma unit específica / Mix aleatório global.
3. Escolhe **tamanho da sessão**: 10 / 20 / 50 questões (ou Infinito — segue até errar 3).
4. Joga: pergunta + 4 alternativas, timer (Medium/Hard), combo multiplier, XP no final, resumo com erros para revisar.

**Geração das perguntas (sem limite de 10 — atende seu "completo e satisfatório"):**
As perguntas são geradas dinamicamente a partir do conteúdo já existente, gerando facilmente **centenas** de variações:
- **Tipo A — Tradução EN→PT**: palavra do Word Bank + 3 distratores de outras units.
- **Tipo B — Tradução PT→EN**: inverso do A.
- **Tipo C — Complete a frase**: pega frase do Easy to Understand, remove uma palavra, oferece 4 opções.
- **Tipo D — Qual é a forma correta?**: gera do banco de gramática (ex: "He ___ pizza" → eat / eats / eating / eaten).
- **Tipo E — Diálogo certo**: linha do diálogo + 4 respostas plausíveis, uma correta.

Para Tipos D e E, criamos um banco-semente novo (`spn_practice_questions`) com ~150 perguntas pré-escritas cobrindo todas as 12 units (também via migration). Os Tipos A/B/C são gerados em runtime a partir do que já existe — então o volume cresce automaticamente à medida que mais conteúdo é cadastrado.

**Componentes:**
- `PracticeHub.tsx` — tela de escolha (nível/escopo/tamanho) com visual vibrante.
- `PracticeSession.tsx` — engine do jogo (timer, combo, vidas, confete).
- `PracticeResult.tsx` — tela final com XP ganho, acurácia, lista de erros.
- `usePracticeQuestions.ts` — hook que monta o pool, embaralha, gera distratores.

**Persistência:**
- Nova tabela `spn_practice_questions` (id, unit_id null permitido, kind, question, options jsonb, correct_index, difficulty, sort_order).
- Nova tabela `spn_practice_sessions` (id, user_id, scope, difficulty, total, correct, xp_earned, created_at).
- Pontos vão para `spn_points` existente.

## Arquivos afetados

**Banco (1 migration):**
- `supabase/migrations/<ts>_book1_seed_and_practice.sql`
  - INSERTs do Book 1 + 12 units + word bank + STP + easy + exercises (idempotentes).
  - CREATE TABLE `spn_practice_questions` + GRANT + RLS (read=authenticated).
  - CREATE TABLE `spn_practice_sessions` + GRANT + RLS (user vê só os seus, admin vê tudo).
  - INSERT de ~150 perguntas Tipo D/E.

**Novos arquivos:**
- `src/components/Spn/Practice/PracticeHub.tsx`
- `src/components/Spn/Practice/PracticeSession.tsx`
- `src/components/Spn/Practice/PracticeResult.tsx`
- `src/components/Spn/Practice/QuestionCard.tsx`
- `src/hooks/spn/usePracticeQuestions.ts`
- `src/components/Spn/effects/Sparkles.tsx` (SVG glow reutilizável)
- `src/components/Spn/effects/ConfettiBurst.tsx`

**Edits:**
- `src/pages/SpnDashboard.tsx` — registra view `'practice'`.
- `src/components/Spn/SpnSidebar.tsx` + `SpnMobileNav.tsx` — item "Practice" 🎮.
- `src/components/Spn/BooksView.tsx`, `WordBankStudentView.tsx`, `ExercisesView.tsx`, `StudentDashboard.tsx` — classes/efeitos visuais novos.
- `src/index.css` — bloco `.spn-student` com tokens, gradientes, keyframes `shimmer`/`sparkle`/`glow-pulse`.
- `tailwind.config.ts` — registra as 3 keyframes/animations.
- `package.json` — adiciona `canvas-confetti` (~6kb).

## Impacto

**1. Usuário final (UX/telas/fluxos):**
- Aluno vê novo item "Practice" na sidebar e bottom-nav; ao entrar, escolhe nível/escopo/tamanho e joga sessões com timer, combo, confete e XP.
- Todas as telas existentes do aluno ganham acabamento gamificado (gradients, glow, animações de acerto) — mesmas funcionalidades, visual mais vibrante.
- Book 1 passa a aparecer pronto e populado, com 12 units progressivas. Aluno consegue começar do zero sem depender de cadastro manual.
- Admin/teacher: nenhuma tela mudou; o admin de books continua editável e o Book 1 pode ser editado/expandido depois.

**2. Dados (migrations/RLS/performance):**
- 1 migration grande, mas dividida em blocos idempotentes (`ON CONFLICT DO NOTHING`) — segura para re-execução.
- 2 tabelas novas (`spn_practice_questions`, `spn_practice_sessions`) com GRANTs + RLS conforme padrão SPN.
- Volume estimado: ~12 units + ~200 word bank items + ~80 STP cards + ~80 easy items + ~100 exercises + 150 practice questions. Tudo abaixo de qualquer limite.
- Sessões geram inserts pequenos por jogada — sem risco de performance.
- Practice questions são lidas com paginação correta (`fetchAllPaginated` se ultrapassar 1000 no futuro).

**3. Riscos colaterais:**
- Conteúdo do Book 1 é opinativo — se você quiser revisar palavras/exemplos antes de eu popular, melhor falar agora. Posso gerar tudo e você edita depois pelo admin.
- `canvas-confetti` é uma dep nova (leve, sem deps transitivas relevantes).
- Animações novas escopadas em `.spn-student` para não vazar para outras áreas do app (CRM, jurídico, etc.).
- Nenhuma mudança nos tokens globais nem em outros módulos.

**4. Quem é afetado:**
- **Alunos SPN**: ganham conteúdo pronto + visual novo + jogo.
- **Admin/Teacher SPN**: nenhuma mudança nas telas administrativas; podem editar o Book 1 normalmente depois.
- **Outros módulos do app (Veridicto/CRM/Vouti)**: zero impacto — mudanças isoladas em `src/components/Spn/*` e bloco escopado em `index.css`.

## Validação
- Rodar a migration e confirmar via SQL: 1 book "Book 1", 12 units, contagens esperadas de word bank/STP/easy/exercises, 150 practice questions.
- Login como aluno → ver Book 1 populado → abrir cada seção de Unit 1.
- Entrar em Practice → testar Easy/Medium/Hard, escopo por unit e global, sessão de 10/20/50 → confirmar XP gravado em `spn_points` e sessão em `spn_practice_sessions`.
- Verificar mobile (preview mobile) — animações fluidas, sem layout quebrado.
- Confirmar que CRM/Agenda/Vouti continuam visualmente idênticos.

## Pendência antes de implementar
Confirme:
1. **Lista das 12 units acima está OK?** (posso ajustar ordem/temas).
2. **Quantidade**: ~200 palavras + ~150 perguntas de jogo está bom, ou quer ainda mais denso (ex: 300+ perguntas)?
3. **Áudio**: pulo `audio_url` por enquanto (deixa null) — você adiciona depois pelo admin se quiser. OK?
