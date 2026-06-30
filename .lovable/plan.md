## Causa raiz
Hoje `spn_exercises` só aceita `kind` ∈ `fill_blank | short_answer | translate` e o `ExercisesView` só renderiza input de texto. Não há exercícios cadastrados para as Units 1–3 do Book 1A, nem suporte a **múltipla escolha** ou **listen & type** (digite o que ouve).

## Correção
**1. Migration — estender `spn_exercises`:**
- `ALTER TABLE` substituindo o CHECK de `kind` para aceitar também `multiple_choice` e `listen_type`.
- `ADD COLUMN options jsonb` (alternativas da múltipla escolha; ex.: `["A red apple","An apple red","Red an apple","Apple a red"]`).
- `ADD COLUMN audio_text text` (frase em inglês para o TTS falar nos exercícios de listening; o áudio é gerado pelo `spnSpeech.ts` que já existe — sem custo, sem storage).

**2. Atualizar `src/components/Spn/ExercisesView.tsx`:**
- Estender o tipo `Exercise.kind` e o `KIND_LABEL` para incluir `multiple_choice` ("Choose the correct answer") e `listen_type` ("Listen and type what you hear").
- `multiple_choice`: renderizar as `options` como botões (igual ao `QuizPlayer`); ao clicar grava como resposta e compara com `correct_answer`.
- `listen_type`: renderizar botão "🔊 Ouvir" que chama `speak(audio_text)` (usa o TTS nativo já implementado), mais o `Input` para digitar. Validação por `normalize()` já existente.
- `fill_blank`, `short_answer`, `translate` continuam exatamente como hoje.

**3. Seeds (INSERTs) — 10 exercícios variados por unidade, com mix das 5 modalidades** (fill_blank, multiple_choice, translate, listen_type, short_answer), todos baseados no vocabulário da própria unidade (já presente em `spn_word_bank_items`):
- **Unit 1 — Food & Drinks**: ex. translate "Maçã vermelha" → "A red apple"; multiple_choice "Which is a fruit?"; listen_type "I like coffee with milk"; fill_blank "A ___ banana (banana amarela)" → "yellow"; etc.
- **Unit 2 — Snacks & Drinks**: torta de pêssego, limonada rosa, leite de soja, milkshake de baunilha, etc.
- **Unit 3 — Things I Own**: jaqueta de couro, fones sem fio, jeans, console novo, etc.

Cada exercício recebe `explanation_pt` e `learning_tip_pt` curtos, aproveitando a UI de "Aprendizado do dia" que já existe.

## Arquivos afetados
- Migration nova (1 arquivo) — altera `spn_exercises` (CHECK + 2 colunas).
- INSERTs via tool de dados — 30 linhas em `spn_exercises` (10 por unit).
- `src/components/Spn/ExercisesView.tsx` — adiciona renderização de `multiple_choice` e `listen_type` (sem mexer no fluxo dos demais kinds).
- Nenhuma outra tela é afetada; `spn_exercise_answers` e RLS atuais já cobrem os novos kinds.

## Impacto
1. **UX**: Em Book 1A → Unit 1/2/3, o aluno passa a ver 10 exercícios variados por unidade, com múltipla escolha (botões), digitação livre, tradução e "ouça e escreva" (ícone de play que fala a frase em inglês). Modo Prática e Prova continuam funcionando como hoje, com correção, "Ver resposta" e "Aprendizado do dia".
2. **Dados**: +30 linhas em `spn_exercises` e 2 colunas novas (`options jsonb`, `audio_text text`, nullable). Linhas existentes em outras units permanecem válidas (campos novos ficam NULL). Constraint de `kind` ampliada — não invalida nada existente.
3. **Riscos colaterais**: Mínimos. Como o front trata `kind` desconhecido com fallback do input atual, qualquer exercício antigo continua renderizando igual. TTS é client-side — funciona offline e sem custo.
4. **Quem é afetado**: Apenas alunos SPN nas Units 1–3 do Book 1A. Professores/admin não precisam de ação.

## Validação
- Abrir cada unit e conferir 10 cards numerados, com 5 tipos distintos representados.
- Clicar "🔊 Ouvir" em um `listen_type` e confirmar que a frase é falada em inglês; digitar e verificar a correção.
- Clicar uma opção de `multiple_choice` e ver feedback verde/vermelho.
- Verificar contagem no HUD ("X / 10 corretos") e o card "Aprendizado do dia" após "Corrigir tudo".
- SQL: `SELECT unit_id, count(*) FROM spn_exercises GROUP BY unit_id` → 10 por unit das 3 unidades novas.
